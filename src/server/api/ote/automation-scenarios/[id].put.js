import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteAutomationScenarios } from '../../../db/schema.js'
import { fetchAutomationScenarioForGroup, resolveAutomationViewer } from '../../../utils/automation-access.js'
import { parseAndValidateAutomationGraphBody } from '../../../utils/automation-scenario-graph.js'
import { invalidateAutomationScheduleGraphCache } from '../../../utils/automation-schedule-graph-cache.js'
import { mapAutomationScenarioFull } from '../../../utils/automation-scenario-map.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

function parseScenarioId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

const ALLOWED_STATUS = new Set(['draft', 'published'])

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

  const existing = await fetchAutomationScenarioForGroup(db, id, gid)
  if (!existing) throw createError({ statusCode: 404, message: 'Сценарий не найден' })

  const body = await readBody(event).catch(() => ({}))

  const patch = {}
  if (body && typeof body.name === 'string') {
    const name = String(body.name || '').trim().slice(0, 256)
    if (!name) throw createError({ statusCode: 400, message: 'Название не может быть пустым' })
    patch.name = name
  }
  if (body && typeof body.status === 'string') {
    const st = String(body.status || '').trim().toLowerCase()
    if (!ALLOWED_STATUS.has(st)) {
      throw createError({ statusCode: 400, message: 'Недопустимый status (draft или published)' })
    }
    patch.status = st
  }
  /** @type {number | undefined} */
  let enabledPatch
  if (body && typeof body.enabled === 'boolean') {
    enabledPatch = body.enabled ? 1 : 0
  }
  let graphJson
  if (body && body.graph !== undefined) {
    const { nodes, edges } = parseAndValidateAutomationGraphBody(body.graph)
    graphJson = JSON.stringify({ nodes, edges })
  }

  if (Object.keys(patch).length === 0 && graphJson === undefined && enabledPatch === undefined) {
    throw createError({ statusCode: 400, message: 'Нет полей для обновления' })
  }

  const userKey = integrationUserKey(user)
  const login = userKey
  const email = String(user.email || '').trim()
  const now = new Date()

  await db
    .update(oteAutomationScenarios)
    .set({
      ...(patch.name != null ? { name: patch.name } : {}),
      ...(patch.status != null ? { status: patch.status } : {}),
      ...(enabledPatch !== undefined ? { enabled: enabledPatch } : {}),
      ...(graphJson !== undefined ? { graphJson } : {}),
      updatedAt: now,
      updatedByUserKey: userKey,
      updatedByLogin: login,
      updatedByEmail: email,
    })
    .where(eq(oteAutomationScenarios.id, id))

  invalidateAutomationScheduleGraphCache(id)

  const row = await fetchAutomationScenarioForGroup(db, id, gid)
  if (!row) throw createError({ statusCode: 404, message: 'Сценарий не найден' })

  return { scenario: mapAutomationScenarioFull(row) }
})
