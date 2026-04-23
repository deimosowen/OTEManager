import { AUDIT_ACTION } from '@app-constants/audit.js'
import { getOteCreationPreset } from '@app-constants/ote-creation-presets.js'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteDeploymentTemplates, oteTcCreations } from '../../../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../utils/audit-log.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { rowToPublic } from '../../../utils/ote-tc-creation-sync.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'
import { queueTeamCityBuild } from '../../../utils/teamcity/client.js'
import { isTeamCityAuthAvailable, resolveTeamCityAuthorizationHeader } from '../../../utils/teamcity/resolve-auth.js'

/**
 * Поставить сборку создания OTE в TeamCity и сохранить запись в `ote_tc_creations`.
 * Тело: `{ presetId, properties, deploymentTemplateId? }`.
 * Если задан `deploymentTemplateId`, для поля `default_deploymet_config_template` в TeamCity подставляется YAML из БД.
 */
function parseDeploymentTemplateId(raw) {
  if (raw == null) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = Math.trunc(raw)
    return n > 0 ? n : null
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const n = parseInt(raw.trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

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
  const presetId = body && typeof body.presetId === 'string' ? body.presetId.trim() : ''
  const preset = presetId ? getOteCreationPreset(presetId) : null
  if (!preset) {
    throw createError({ statusCode: 400, message: 'Неизвестный presetId' })
  }

  const propsIn =
    body && typeof body.properties === 'object' && body.properties ? { ...body.properties } : {}
  const deploymentTemplateId = parseDeploymentTemplateId(body?.deploymentTemplateId)
  if (deploymentTemplateId) {
    delete propsIn.default_deploymet_config_template
  }

  const db = getDb()

  /** YAML из каталога шаблонов (целиком уходит в default_deploymet_config_template в TeamCity). */
  let injectedTemplateYaml = null
  const presetUsesTemplateCatalog = preset.fields.some((f) => f.type === 'template_select')
  if (deploymentTemplateId && presetUsesTemplateCatalog) {
    const rows = await db
      .select({ yamlBody: oteDeploymentTemplates.yamlBody })
      .from(oteDeploymentTemplates)
      .where(eq(oteDeploymentTemplates.id, deploymentTemplateId))
      .limit(1)
    const row = rows[0]
    if (!row) {
      throw createError({ statusCode: 400, message: 'Шаблон не найден' })
    }
    const yamlStr = row.yamlBody != null ? String(row.yamlBody) : ''
    if (!yamlStr.trim()) {
      throw createError({ statusCode: 400, message: 'У шаблона пустой YAML' })
    }
    injectedTemplateYaml = yamlStr
  }

  /** @type {Record<string, string>} */
  const tcProps = {}
  for (const f of preset.fields) {
    if (f.type === 'template_select' && injectedTemplateYaml != null) {
      tcProps[f.name] = injectedTemplateYaml
      continue
    }

    const raw = propsIn[f.name]
    const s = raw == null ? '' : String(raw)
    if (f.type === 'template_select') {
      if (f.required && !s.trim()) {
        throw createError({ statusCode: 400, message: `Заполните поле: ${f.label}` })
      }
      if (s.trim()) tcProps[f.name] = s
      continue
    }

    const trimmed = String(s).trim()
    if (f.required && !trimmed) {
      throw createError({ statusCode: 400, message: `Заполните поле: ${f.label}` })
    }
    if (trimmed) tcProps[f.name] = trimmed
  }

  const authorization = await resolveTeamCityAuthorizationHeader(config, { user })
  let tc
  try {
    tc = await queueTeamCityBuild({
      config,
      buildTypeId: preset.buildTypeId,
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
        details: { stage: 'queue', presetId: preset.id, buildTypeId: preset.buildTypeId, error: msg },
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
      presetId: preset.id,
      buildTypeId: preset.buildTypeId,
      teamcityBuildId: buildId || null,
      teamcityWebUrl: tc.webUrl ? String(tc.webUrl).trim() : null,
      status: failedQueue ? 'failed' : 'queued',
      requestPropertiesJson: JSON.stringify(tcProps),
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
          presetId: preset.id,
          buildTypeId: preset.buildTypeId,
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
          presetId: preset.id,
          buildTypeId: preset.buildTypeId,
          teamcityBuildId: buildId,
          teamcityWebUrl: tc.webUrl || null,
        },
      }),
    )
  }

  return { creation: rowToPublic(created) }
})
