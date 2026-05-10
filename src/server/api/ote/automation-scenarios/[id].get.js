import { getDb } from '../../../db/client.js'
import { fetchAutomationScenarioForGroup, resolveAutomationViewer } from '../../../utils/automation-access.js'
import { mapAutomationScenarioFull } from '../../../utils/automation-scenario-map.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

function parseScenarioId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

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

  const id = parseScenarioId(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, message: 'Некорректный id' })

  const row = await fetchAutomationScenarioForGroup(db, id, gid)
  if (!row) throw createError({ statusCode: 404, message: 'Сценарий не найден' })

  return { scenario: mapAutomationScenarioFull(row) }
})
