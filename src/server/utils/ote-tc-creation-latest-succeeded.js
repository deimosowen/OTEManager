import { and, desc, eq, or, sql } from 'drizzle-orm'
import { oteTcCreations } from '../db/schema.js'

/**
 * Последняя успешная сборка по `metadata.tag` (колонка или параметр запроса) — для выбора шаблона при обновлении OTE.
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} metadataTag
 */
export async function fetchLatestSucceededOteTcCreationForMetadataTag(db, metadataTag) {
  const t = String(metadataTag || '').trim()
  if (!t) return null

  const rows = await db
    .select()
    .from(oteTcCreations)
    .where(
      and(
        eq(oteTcCreations.status, 'succeeded'),
        or(eq(oteTcCreations.metadataTag, t), sql`json_extract(${oteTcCreations.requestPropertiesJson}, '$."metadata.tag"') = ${t}`),
      ),
    )
    .orderBy(desc(oteTcCreations.updatedAt), desc(oteTcCreations.createdAt))
    .limit(1)

  return rows[0] || null
}
