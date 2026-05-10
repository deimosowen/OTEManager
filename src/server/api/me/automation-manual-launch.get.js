import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../../db/client.js'
import { oteAutomationScenarios } from '../../db/schema.js'
import { resolveAutomationViewer } from '../../utils/automation-access.js'
import { extractManualLaunchButtonsFromGraph } from '../../utils/automation-manual-panel.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const db = getDb()
  const config = useRuntimeConfig(event)
  const viewer = await resolveAutomationViewer(db, config, user)
  if (!viewer?.userKey) {
    throw createError({ statusCode: 401, message: 'Требуется вход' })
  }
  if (viewer.groupId == null || !Number.isFinite(Number(viewer.groupId))) {
    return { buttons: [] }
  }
  const gid = Math.trunc(Number(viewer.groupId))

  const rows = await db
    .select()
    .from(oteAutomationScenarios)
    .where(and(eq(oteAutomationScenarios.groupId, gid), eq(oteAutomationScenarios.enabled, 1)))
    .orderBy(desc(oteAutomationScenarios.updatedAt))

  /** @type {{ scenarioId: number, nodeId: string, label: string, variant: string, iconKey: string }[]} */
  const buttons = []
  for (const row of rows) {
    let graph
    try {
      graph = JSON.parse(String(row.graphJson || '{}'))
    } catch {
      continue
    }
    const sid = Number(row.id)
    if (!Number.isFinite(sid)) continue
    buttons.push(...extractManualLaunchButtonsFromGraph(sid, graph))
  }

  return { buttons }
})
