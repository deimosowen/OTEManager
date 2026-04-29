import { AUDIT_ACTION } from '@app-constants/audit.js'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteBuildTemplates, oteTcCreations } from '../../../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../utils/audit-log.js'
import { mergeBuildTemplateOverrides, parseBuildTemplateParams } from '../../../utils/build-template-params.js'
import { renderYamlPercentPlaceholders } from '../../../utils/build-template-render.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { rowToPublic } from '../../../utils/ote-tc-creation-sync.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'
import { queueTeamCityBuild } from '../../../utils/teamcity/client.js'
import { isTeamCityAuthAvailable, resolveTeamCityAuthorizationHeader } from '../../../utils/teamcity/resolve-auth.js'

/**
 * Поставить сборку создания OTE в TeamCity и сохранить запись в `ote_tc_creations`.
 * Тело: `{ buildTemplateId, overrides? }`.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const config = useRuntimeConfig(event)
  if (!(await isTeamCityAuthAvailable(config, { user }))) {
    throw createError({
      statusCode: 503,
      message:
        'TeamCity недоступен: добавьте персональный токен в профиле или настройте серверные переменные NUXT_TC_ACCESS_TOKEN / NUXT_TC_USERNAME и NUXT_TC_PASSWORD.',
    })
  }

  const body = await readBody(event)
  const rawId = body?.buildTemplateId
  const buildTemplateId = Number(String(rawId ?? '').trim())
  if (!Number.isFinite(buildTemplateId) || buildTemplateId < 1) {
    throw createError({ statusCode: 400, message: 'Некорректный buildTemplateId' })
  }

  const db = getDb()
  const userKey = integrationUserKey(user)
  const rows = await db
    .select()
    .from(oteBuildTemplates)
    .where(eq(oteBuildTemplates.id, buildTemplateId))
    .limit(1)
  const tpl = rows[0]
  if (!tpl) {
    throw createError({ statusCode: 404, message: 'Шаблон не найден' })
  }
  if (!('isPersonal' in tpl) || (tpl.isPersonal === 1 && tpl.createdByLogin !== userKey)) {
    throw createError({ statusCode: 403, message: 'Нет доступа к этому шаблону' })
  }

  /** @type {Record<string, string>} */
  let baseParams = {}
  try {
    baseParams = parseBuildTemplateParams(JSON.parse(String(tpl.paramsJson || '{}')))
  } catch {
    baseParams = {}
  }

  let merged = {}
  try {
    merged = mergeBuildTemplateOverrides(baseParams, body?.overrides)
  } catch (e) {
    throw createError({ statusCode: 400, message: e?.message || String(e) })
  }

  let renderedYaml = ''
  try {
    renderedYaml = renderYamlPercentPlaceholders(String(tpl.yamlBody || ''), merged)
  } catch (e) {
    throw createError({ statusCode: 400, message: e?.message || String(e) })
  }

  /** @type {Record<string, string>} */
  const tcProps = { ...merged }
  tcProps.default_deploymet_config_template = renderedYaml

  const authorization = await resolveTeamCityAuthorizationHeader(config, { user })
  let tc
  const buildTypeId = String(tpl.teamcityBuildTypeId || '').trim()
  if (!buildTypeId) {
    throw createError({ statusCode: 500, message: 'У шаблона не задан teamcityBuildTypeId' })
  }
  try {
    tc = await queueTeamCityBuild({
      config,
      buildTypeId,
      properties: tcProps,
      authorization,
    })
  } catch (err) {
    const msg = err?.message || String(err)
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: AUDIT_ACTION.OTE_CREATE_TC_FAILED,
        oteResourceId: null,
        oteTag: tcProps['metadata.tag'] || null,
        details: { stage: 'queue', buildTemplateId, buildTypeId, error: msg },
      }),
    )
    throw createError({ statusCode: 502, message: msg })
  }

  const now = new Date()
  const buildId = tc.buildId ? String(tc.buildId).trim() : ''
  const failedQueue = !buildId

  const [created] = await db
    .insert(oteTcCreations)
    .values({
      createdAt: now,
      updatedAt: now,
      actorLogin: integrationUserKey(user),
      actorEmail: String(user.email || '').trim(),
      presetId: 'build-template',
      buildTypeId,
      teamcityBuildId: buildId || null,
      teamcityWebUrl: tc.webUrl ? String(tc.webUrl).trim() : null,
      status: failedQueue ? 'failed' : 'queued',
      requestPropertiesJson: JSON.stringify(tcProps),
      buildTemplateId,
      requestTemplateYaml: String(tpl.yamlBody || ''),
      requestRenderedYaml: renderedYaml,
      requestParamsJson: JSON.stringify(merged),
      lastError: failedQueue ? 'TeamCity не вернул идентификатор сборки' : null,
    })
    .returning()

  if (!created) {
    throw createError({ statusCode: 500, message: 'Не удалось сохранить запись' })
  }

  if (failedQueue) {
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: AUDIT_ACTION.OTE_CREATE_TC_FAILED,
        oteResourceId: `tc-creation:${created.id}`,
        oteTag: tcProps['metadata.tag'] || null,
        details: {
          stage: 'queue_empty_build_id',
          creationId: created.id,
          buildTemplateId,
          buildTypeId,
          teamcityHref: tc.href || null,
        },
      }),
    )
  } else {
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: AUDIT_ACTION.OTE_CREATE_TC_QUEUE,
        oteResourceId: `tc-creation:${created.id}`,
        oteTag: tcProps['metadata.tag'] || null,
        details: {
          creationId: created.id,
          buildTemplateId,
          buildTypeId,
          teamcityBuildId: buildId,
          teamcityWebUrl: tc.webUrl || null,
        },
      }),
    )
  }

  return { creation: rowToPublic(created) }
})
