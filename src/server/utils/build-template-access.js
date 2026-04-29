import { and, eq, or } from 'drizzle-orm'
import { oteBuildTemplates } from '../db/schema.js'

/**
 * Шаблон доступен пользователю: общий или личный этого же пользователя (ключ как в `created_by_login`).
 * @param {string} userKey
 */
export function whereBuildTemplateVisibleToUser(userKey) {
  return or(eq(oteBuildTemplates.isPersonal, 0), eq(oteBuildTemplates.createdByLogin, userKey))
}

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase<typeof import('../db/schema.js')>} db
 * @param {number} templateId
 * @param {string} userKey
 * @returns {Promise<boolean>}
 */
export async function buildTemplateIdVisibleToUser(db, templateId, userKey) {
  const rows = await db
    .select({ id: oteBuildTemplates.id })
    .from(oteBuildTemplates)
    .where(and(eq(oteBuildTemplates.id, templateId), whereBuildTemplateVisibleToUser(userKey)))
    .limit(1)
  return Boolean(rows[0])
}

/**
 * @param {unknown} body
 */
export function parseIsPersonalFromBody(body) {
  if (!body || typeof body !== 'object') return false
  const v = /** @type {Record<string, unknown>} */ (body).isPersonal
  if (v === true || v === 1) return true
  if (v === 'true' || v === '1' || v === 'yes') return true
  return false
}

/**
 * @param {unknown} v
 */
export function rowIsPersonal(v) {
  return v === 1 || v === true
}

