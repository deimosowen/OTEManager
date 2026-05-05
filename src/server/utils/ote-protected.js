import { eq, inArray } from 'drizzle-orm'
import { oteProtectedResources } from '../db/schema.js'

/**
 * @param {import('drizzle-orm').LibSQLDatabase<typeof import('../db/schema.js')>} db
 * @param {string[]} ids
 * @returns {Promise<Set<string>>}
 */
export async function fetchOteProtectedIdSet(db, ids) {
  const clean = [...new Set(ids.filter(Boolean).map(String))]
  if (!clean.length) return new Set()
  const rows = await db
    .select({ id: oteProtectedResources.oteResourceId })
    .from(oteProtectedResources)
    .where(inArray(oteProtectedResources.oteResourceId, clean))
  return new Set(rows.map((r) => r.id))
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase<typeof import('../db/schema.js')>} db
 * @param {string} oteResourceId
 */
export async function isOteResourceProtected(db, oteResourceId) {
  if (!oteResourceId) return false
  const rows = await db
    .select({ k: oteProtectedResources.oteResourceId })
    .from(oteProtectedResources)
    .where(eq(oteProtectedResources.oteResourceId, oteResourceId))
    .limit(1)
  return rows.length > 0
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase<typeof import('../db/schema.js')>} db
 * @param {{ oteResourceId: string, markedByUserKey: string }} row
 */
export async function insertOteProtectedRow(db, row) {
  const now = new Date()
  await db.insert(oteProtectedResources).values({
    oteResourceId: String(row.oteResourceId),
    markedAt: now,
    markedByUserKey: String(row.markedByUserKey || '').slice(0, 256),
  })
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase<typeof import('../db/schema.js')>} db
 * @param {string} oteResourceId
 */
export async function deleteOteProtectedRow(db, oteResourceId) {
  await db.delete(oteProtectedResources).where(eq(oteProtectedResources.oteResourceId, oteResourceId))
}
