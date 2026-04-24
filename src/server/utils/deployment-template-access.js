import { and, eq, or } from 'drizzle-orm'
import { oteDeploymentTemplates } from '../db/schema.js'

/**
 * Шаблон доступен пользователю: общий или личный этого же пользователя (ключ как в `created_by_login`).
 * @param {string} userKey
 */
export function whereDeploymentTemplateVisibleToUser(userKey) {
  return or(eq(oteDeploymentTemplates.isPersonal, 0), eq(oteDeploymentTemplates.createdByLogin, userKey))
}

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase<typeof import('../db/schema.js')>} db
 * @param {number} templateId
 * @param {string} userKey
 * @returns {Promise<string | null>} YAML или null, если нет или недоступен
 */
export async function fetchDeploymentTemplateYamlIfVisible(db, templateId, userKey) {
  const rows = await db
    .select({ yamlBody: oteDeploymentTemplates.yamlBody })
    .from(oteDeploymentTemplates)
    .where(and(eq(oteDeploymentTemplates.id, templateId), whereDeploymentTemplateVisibleToUser(userKey)))
    .limit(1)
  const y = rows[0]?.yamlBody
  return y != null && String(y).trim() ? String(y) : null
}

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase<typeof import('../db/schema.js')>} db
 * @param {number} templateId
 * @param {string} userKey
 * @returns {Promise<boolean>}
 */
export async function deploymentTemplateIdVisibleToUser(db, templateId, userKey) {
  const rows = await db
    .select({ id: oteDeploymentTemplates.id })
    .from(oteDeploymentTemplates)
    .where(and(eq(oteDeploymentTemplates.id, templateId), whereDeploymentTemplateVisibleToUser(userKey)))
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
