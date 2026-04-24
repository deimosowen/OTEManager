import { desc, eq, or, sql } from 'drizzle-orm'
import { oteTcCreations } from '../db/schema.js'

const TEMPLATE_KEY = 'default_deploymet_config_template'

const CREATION_SUMMARY_FIELDS = {
  id: oteTcCreations.id,
  createdAt: oteTcCreations.createdAt,
  updatedAt: oteTcCreations.updatedAt,
  actorLogin: oteTcCreations.actorLogin,
  actorEmail: oteTcCreations.actorEmail,
  presetId: oteTcCreations.presetId,
  buildTypeId: oteTcCreations.buildTypeId,
  teamcityBuildId: oteTcCreations.teamcityBuildId,
  teamcityWebUrl: oteTcCreations.teamcityWebUrl,
  status: oteTcCreations.status,
  metadataTag: oteTcCreations.metadataTag,
  caseoneVersion: oteTcCreations.caseoneVersion,
  deploymentResultJson: oteTcCreations.deploymentResultJson,
  rabbitUrl: oteTcCreations.rabbitUrl,
  saasAppUrl: oteTcCreations.saasAppUrl,
  caseoneUrl: oteTcCreations.caseoneUrl,
  lastError: oteTcCreations.lastError,
}

/** Макс. длина `deployment_result` в ответе API карточки (полная строка может быть очень длинной). */
const DEPLOYMENT_RESULT_JSON_MAX = 12000

function tagMatchWhere(metadataTag) {
  const tag = String(metadataTag || '').trim()
  return or(
    eq(oteTcCreations.metadataTag, tag),
    sql`json_extract(${oteTcCreations.requestPropertiesJson}, '$."metadata.tag"') = ${tag}`,
  )
}

function toIso(d) {
  if (!d) return null
  if (d instanceof Date) return d.toISOString()
  const t = new Date(d).getTime()
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

function creationTimeMs(row) {
  const d = row.createdAt
  if (d instanceof Date) return d.getTime()
  const t = new Date(d).getTime()
  return Number.isNaN(t) ? 0 : t
}

/**
 * Сводка по последнему подходящему запросу создания OTE в TeamCity для метки (приоритет — последний успешный).
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} metadataTag
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function fetchLatestOteTcCreationSummaryByMetadataTag(db, metadataTag) {
  const tag = String(metadataTag || '').trim()
  if (!tag) return null

  const rows = await db
    .select(CREATION_SUMMARY_FIELDS)
    .from(oteTcCreations)
    .where(tagMatchWhere(tag))
    .orderBy(desc(oteTcCreations.createdAt))
    .limit(80)

  if (!rows.length) return null

  const succeeded = rows.filter((r) => r.status === 'succeeded')
  const pick =
    succeeded.length > 0 ? succeeded.reduce((a, b) => (creationTimeMs(b) > creationTimeMs(a) ? b : a)) : rows[0]

  let deploymentResultJson = pick.deploymentResultJson != null ? String(pick.deploymentResultJson) : null
  if (deploymentResultJson && deploymentResultJson.length > DEPLOYMENT_RESULT_JSON_MAX) {
    deploymentResultJson = `${deploymentResultJson.slice(0, DEPLOYMENT_RESULT_JSON_MAX)}\n… (обрезано)`
  }

  return {
    id: pick.id,
    status: pick.status,
    presetId: pick.presetId,
    buildTypeId: pick.buildTypeId,
    createdAt: toIso(pick.createdAt),
    updatedAt: toIso(pick.updatedAt),
    actorLogin: pick.actorLogin,
    actorEmail: pick.actorEmail,
    teamcityBuildId: pick.teamcityBuildId,
    teamcityWebUrl: pick.teamcityWebUrl,
    metadataTag: pick.metadataTag,
    caseoneVersion: pick.caseoneVersion,
    rabbitUrl: pick.rabbitUrl,
    saasAppUrl: pick.saasAppUrl,
    caseoneUrl: pick.caseoneUrl,
    lastError: pick.lastError,
    deploymentResultJson,
  }
}

/**
 * YAML шаблона из JSON параметров запроса TeamCity (как в `ote_tc_creations.request_properties_json`).
 * @param {string | null | undefined} raw
 */
export function extractDefaultDeploymentTemplateFromRequestJson(raw) {
  if (!raw || typeof raw !== 'string') return ''
  try {
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object') return ''
    const yaml = j[TEMPLATE_KEY]
    return typeof yaml === 'string' && yaml.trim() ? yaml.trim() : ''
  } catch {
    return ''
  }
}

/**
 * Последний непустой `default_deploymet_config_template` из записей создания OTE по метке metadata.tag.
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} metadataTag значение метки OTE (как в YC / TeamCity)
 */
export async function fetchLatestTcYamlForOteMetadataTag(db, metadataTag) {
  const tag = String(metadataTag || '').trim()
  if (!tag) return ''

  const rows = await db
    .select({ requestPropertiesJson: oteTcCreations.requestPropertiesJson })
    .from(oteTcCreations)
    .where(tagMatchWhere(tag))
    .orderBy(desc(oteTcCreations.createdAt))
    .limit(15)

  for (const row of rows) {
    const yaml = extractDefaultDeploymentTemplateFromRequestJson(row.requestPropertiesJson)
    if (yaml) return yaml
  }
  return ''
}
