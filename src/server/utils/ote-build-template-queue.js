import { createError } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { oteBuildTemplates, oteTcCreations } from '../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from './audit-log.js'
import { mergeBuildTemplateOverrides, parseBuildTemplateParams } from './build-template-params.js'
import { renderYamlPercentPlaceholders } from './build-template-render.js'
import { integrationUserKey } from './integrations/user-credentials.js'
import { oteTcJobAuditActions } from './ote-tc-job-audit.js'
import { queueTeamCityBuild } from './teamcity/client.js'
import { fetchTeamCityGroupSettingsByUserKey } from './teamcity/group-settings.js'
import { resolveTeamCityAuthorizationHeader } from './teamcity/resolve-auth.js'

/**
 * Поставить сборку TeamCity по шаблону и вставить строку в `ote_tc_creations`.
 *
 * @param {{
 *   user: { login?: string, email?: string, id?: string },
 *   config: import('@nuxt/schema').NitroRuntimeConfig,
 *   buildTemplateId: number,
 *   mergedParams: Record<string, string>,
 *   presetId: string,
 * }} opts
 * @returns {Promise<{ created: typeof oteTcCreations.$inferSelect, tc: { buildId?: string, webUrl?: string, href?: string } }>}
 */
export async function queueOteTcJobFromBuildTemplate(opts) {
  const { user, config, buildTemplateId, mergedParams, presetId } = opts
  const db = getDb()
  const userKey = integrationUserKey(user)
  const rows = await db.select().from(oteBuildTemplates).where(eq(oteBuildTemplates.id, buildTemplateId)).limit(1)
  const tpl = rows[0]
  if (!tpl) {
    throw createError({ statusCode: 404, message: 'Шаблон не найден' })
  }
  if (!('isPersonal' in tpl) || (tpl.isPersonal === 1 && tpl.createdByLogin !== userKey)) {
    throw createError({ statusCode: 403, message: 'Нет доступа к этому шаблону' })
  }

  let renderedYaml = ''
  try {
    renderedYaml = renderYamlPercentPlaceholders(String(tpl.yamlBody || ''), mergedParams)
  } catch (e) {
    throw createError({ statusCode: 400, message: e?.message || String(e) })
  }

  /** @type {Record<string, string>} */
  const tcProps = { ...mergedParams }
  tcProps.default_deploymet_config_template = renderedYaml

  const authorization = await resolveTeamCityAuthorizationHeader(config, { user })
  const tcGroup = await fetchTeamCityGroupSettingsByUserKey(db, userKey)
  const tcBase = tcGroup?.tcRestBaseUrl ? String(tcGroup.tcRestBaseUrl).trim().replace(/\/+$/, '') : ''
  if (!tcBase) {
    throw createError({ statusCode: 503, message: 'Нет настроек TeamCity для вашей группы (REST URL). Обратитесь к администратору.' })
  }
  const buildTypeId = String(tpl.teamcityBuildTypeId || '').trim()
  if (!buildTypeId) {
    throw createError({ statusCode: 500, message: 'У шаблона не задан teamcityBuildTypeId' })
  }

  const audit = oteTcJobAuditActions(presetId)

  let tc
  try {
    tc = await queueTeamCityBuild({
      config,
      baseUrl: tcBase,
      buildTypeId,
      properties: tcProps,
      authorization,
    })
  } catch (err) {
    const msg = err?.message || String(err)
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: audit.failed,
        oteResourceId: null,
        oteTag: tcProps['metadata.tag'] || null,
        details: { stage: 'queue', buildTemplateId, buildTypeId, presetId, error: msg },
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
      actorLogin: userKey,
      actorEmail: String(user.email || '').trim(),
      presetId,
      buildTypeId,
      teamcityBuildId: buildId || null,
      teamcityWebUrl: tc.webUrl ? String(tc.webUrl).trim() : null,
      status: failedQueue ? 'failed' : 'queued',
      requestPropertiesJson: JSON.stringify(tcProps),
      buildTemplateId,
      requestTemplateYaml: String(tpl.yamlBody || ''),
      requestRenderedYaml: renderedYaml,
      requestParamsJson: JSON.stringify(mergedParams),
      lastError: failedQueue ? 'TeamCity не вернул идентификатор сборки' : null,
    })
    .returning()

  if (!created) {
    throw createError({ statusCode: 500, message: 'Не удалось сохранить запись' })
  }

  if (failedQueue) {
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: audit.failed,
        oteResourceId: `tc-creation:${created.id}`,
        oteTag: tcProps['metadata.tag'] || null,
        details: {
          stage: 'queue_empty_build_id',
          creationId: created.id,
          buildTemplateId,
          buildTypeId,
          presetId,
          teamcityHref: tc.href || null,
        },
      }),
    )
  }

  return { created, tc }
}

/**
 * Разбор params_json шаблона + overrides (как на странице создания).
 * @param {unknown} tplParamsJson
 * @param {unknown} rawOverrides
 */
export function mergeParamsFromTemplateAndOverrides(tplParamsJson, rawOverrides) {
  /** @type {Record<string, string>} */
  let baseParams = {}
  try {
    baseParams = parseBuildTemplateParams(JSON.parse(String(tplParamsJson || '{}')))
  } catch {
    baseParams = {}
  }
  return mergeBuildTemplateOverrides(baseParams, rawOverrides)
}
