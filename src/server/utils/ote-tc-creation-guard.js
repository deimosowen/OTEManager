import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { createError } from 'h3'
import { oteTcCreations } from '../db/schema.js'

const ACTIVE_CREATION_STATUSES = /** @type {const} */ (['queued', 'running'])

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
