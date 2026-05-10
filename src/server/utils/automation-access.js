import { and, eq } from 'drizzle-orm'
import { oteAutomationScenarios } from '../db/schema.js'
import { resolveBuildTemplateViewer } from './build-template-access.js'

/**
 * Наблюдатель для сценариев автоматизации (та же привязка к группе каталога, что и у шаблонов).
 * @param {import('drizzle-orm/libsql').LibSQLDatabase} db
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ login?: string, email?: string, id?: string }} user
 */
export async function resolveAutomationViewer(db, config, user) {
  return resolveBuildTemplateViewer(db, config, user)
}

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase} db
 * @param {number} scenarioId
 * @param {number} groupId
 */
export async function fetchAutomationScenarioForGroup(db, scenarioId, groupId) {
  const rows = await db
    .select()
    .from(oteAutomationScenarios)
    .where(and(eq(oteAutomationScenarios.id, scenarioId), eq(oteAutomationScenarios.groupId, groupId)))
    .limit(1)
  return rows[0] || null
}
