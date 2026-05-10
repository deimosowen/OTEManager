import { desc, eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteAutomationScenarios } from '../../../db/schema.js'
import { resolveAutomationViewer } from '../../../utils/automation-access.js'
import { mapAutomationScenarioSummary } from '../../../utils/automation-scenario-map.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const db = getDb()
  const config = useRuntimeConfig(event)
  const viewer = await resolveAutomationViewer(db, config, user)
  if (!viewer?.userKey) {
    throw createError({ statusCode: 401, message: 'Требуется вход' })
  }
  if (viewer.groupId == null || !Number.isFinite(Number(viewer.groupId))) {
    throw createError({ statusCode: 403, message: 'Не назначена группа каталога' })
  }
  const gid = Math.trunc(Number(viewer.groupId))
  const rows = await db
    .select()
    .from(oteAutomationScenarios)
    .where(eq(oteAutomationScenarios.groupId, gid))
    .orderBy(desc(oteAutomationScenarios.updatedAt))

  return { scenarios: rows.map(mapAutomationScenarioSummary) }
})
