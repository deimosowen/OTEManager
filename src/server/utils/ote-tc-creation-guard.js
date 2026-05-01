import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { createError } from 'h3'
import { oteTcCreations } from '../db/schema.js'

const ACTIVE_CREATION_STATUSES = /** @type {const} */ (['queued', 'running'])

/**
 * Одним запросом: активные создания OTE → карта metadata.tag → запись (самая новая по createdAt на тег).
 * Используется в списке инстансов вместо N отдельных запросов на каждую строку.
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @returns {Promise<Map<string, { id: number, teamcityBuildId: string | null, teamcityWebUrl: string | null }>>}
 */
export async function getActiveOteTcCreationBlockingByMetadataTagMap(db) {
  const rows = await db
    .select({
      id: oteTcCreations.id,
      createdAt: oteTcCreations.createdAt,
      metadataTag: oteTcCreations.metadataTag,
      requestPropertiesJson: oteTcCreations.requestPropertiesJson,
      teamcityBuildId: oteTcCreations.teamcityBuildId,
      teamcityWebUrl: oteTcCreations.teamcityWebUrl,
    })
    .from(oteTcCreations)
    .where(inArray(oteTcCreations.status, ACTIVE_CREATION_STATUSES))
    .orderBy(desc(oteTcCreations.createdAt))

  /** @type {Map<string, { id: number, teamcityBuildId: string | null, teamcityWebUrl: string | null }>} */
  const byTag = new Map()
  for (const row of rows) {
    /** @type {Set<string>} */
    const tags = new Set()
    const col = row.metadataTag ? String(row.metadataTag).trim() : ''
    if (col) tags.add(col)
    try {
      const raw = row.requestPropertiesJson
      const j = raw ? JSON.parse(raw) : null
      if (j && typeof j === 'object' && j['metadata.tag'] != null) {
        const mt = String(j['metadata.tag']).trim()
        if (mt) tags.add(mt)
      }
    } catch {
      /* ignore bad JSON */
    }
    const payload = {
      id: row.id,
      teamcityBuildId: row.teamcityBuildId,
      teamcityWebUrl: row.teamcityWebUrl,
    }
    for (const t of tags) {
      if (!byTag.has(t)) byTag.set(t, payload)
    }
  }
  return byTag
}

/**
 * Активное создание OTE по совпадению metadata.tag:
 * - колонка `metadata_tag` (после появления в Actual parameters на агенте TeamCity),
 * - или параметр `metadata.tag` из JSON запроса сборки (до появления на агенте).
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} metadataTag значение метки с ВМ Яндекса (`labels[metadata-tag]` и т.п.)
 */
export async function findBlockingOteTcCreationForMetadataTag(db, metadataTag) {
  const tag = String(metadataTag || '').trim()
  if (!tag) return null

  const [hit] = await db
    .select({
      id: oteTcCreations.id,
      status: oteTcCreations.status,
      teamcityBuildId: oteTcCreations.teamcityBuildId,
      teamcityWebUrl: oteTcCreations.teamcityWebUrl,
    })
    .from(oteTcCreations)
    .where(
      and(
        inArray(oteTcCreations.status, ACTIVE_CREATION_STATUSES),
        or(
          eq(oteTcCreations.metadataTag, tag),
          sql`json_extract(${oteTcCreations.requestPropertiesJson}, '$."metadata.tag"') = ${tag}`,
        ),
      ),
    )
    .orderBy(desc(oteTcCreations.createdAt))
    .limit(1)

  return hit || null
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} metadataTag
 */
export async function assertMetadataTagNotBlockedByOteCreation(db, metadataTag) {
  const hit = await findBlockingOteTcCreationForMetadataTag(db, metadataTag)
  if (!hit) return
  throw createError({
    statusCode: 409,
    message:
      'Для этой метки (metadata.tag) выполняется создание OTE через TeamCity. Дождитесь завершения сборки — остановка, удаление и другие действия с машинами недоступны.',
    data: {
      reason: 'ote_tc_creation_active',
      oteTcCreationId: hit.id,
      teamcityBuildId: hit.teamcityBuildId,
      teamcityWebUrl: hit.teamcityWebUrl,
    },
  })
}
