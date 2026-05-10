import { getDb } from '../../../../db/client.js'
import { fetchAutomationScenarioForGroup, resolveAutomationViewer } from '../../../../utils/automation-access.js'
import { integrationUserKey } from '../../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'
import { runManualAutomationFromNode } from '../../../../utils/automation-run-manual.js'

function parseScenarioId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const userKey = integrationUserKey(user)
  if (!userKey) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя' })
  }

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
  const en = row.enabled
  if (en !== undefined && en !== null && Number(en) === 0) {
    throw createError({ statusCode: 403, message: 'Сценарий отключён. Включите его в параметрах сценария.' })
  }

  const body = await readBody(event).catch(() => ({}))
  const nodeId = typeof body?.nodeId === 'string' ? body.nodeId.trim() : String(body?.nodeId || '').trim()
  if (!nodeId) {
    throw createError({ statusCode: 400, message: 'Укажите nodeId блока ручного запуска' })
  }

  const result = await runManualAutomationFromNode({ db, config, user }, row, nodeId)
  return result
})
