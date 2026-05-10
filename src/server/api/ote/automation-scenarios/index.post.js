import { getDb } from '../../../db/client.js'
import { oteAutomationScenarios } from '../../../db/schema.js'
import { resolveAutomationViewer } from '../../../utils/automation-access.js'
import { parseAndValidateAutomationGraphBody } from '../../../utils/automation-scenario-graph.js'
import { mapAutomationScenarioFull } from '../../../utils/automation-scenario-map.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

function mustName(body) {
  const v = body && typeof body.name === 'string' ? body.name : ''
  const s = String(v || '').trim().slice(0, 256)
  return s
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

  const body = await readBody(event).catch(() => ({}))
  const name = mustName(body)
  if (!name) throw createError({ statusCode: 400, message: 'Укажите название сценария' })

  const { nodes, edges } = parseAndValidateAutomationGraphBody(body?.graph)
  const graphJson = JSON.stringify({ nodes, edges })

  const userKey = integrationUserKey(user)
  const login = userKey
  const email = String(user.email || '').trim()
  const now = new Date()

  const enabled =
    body && typeof body.enabled === 'boolean' ? (body.enabled ? 1 : 0) : 1

  const inserted = await db
    .insert(oteAutomationScenarios)
    .values({
      groupId: gid,
      name,
      status:
        body && typeof body.status === 'string' && String(body.status).trim().toLowerCase() === 'published'
          ? 'published'
          : 'draft',
      enabled,
      graphJson,
      createdAt: now,
      updatedAt: now,
      createdByUserKey: userKey,
      createdByLogin: login,
      createdByEmail: email,
      updatedByUserKey: userKey,
      updatedByLogin: login,
      updatedByEmail: email,
    })
    .returning()

  const row = inserted?.[0]
  if (!row) throw createError({ statusCode: 500, message: 'Не удалось создать сценарий' })

  return { scenario: mapAutomationScenarioFull(row) }
})
