import { randomUUID } from 'node:crypto'
import { AUDIT_ACTION } from '@app-constants/audit.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../utils/audit-log.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'
import { OTE_STATUS } from '@app-constants/ote.js'

/**
 * Создание демо-строки OTE в UI (без YC) + запись в аудит.
 * Тело: `{ name, envTypeName, caseOneVersion, deployTemplate, dbVersion }`.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const body = await readBody(event)
  const name = body && typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, message: 'Укажите имя OTE' })
  }
  const envTypeName =
    body && typeof body.envTypeName === 'string' && body.envTypeName.trim()
      ? body.envTypeName.trim()
      : 'Astra Linux'
  const caseOneVersion =
    body && typeof body.caseOneVersion === 'string' && body.caseOneVersion.trim()
      ? body.caseOneVersion.trim()
      : 'Master-env'
  const deployTemplate =
    body && typeof body.deployTemplate === 'string' && body.deployTemplate.trim()
      ? body.deployTemplate.trim()
      : 'standard'
  const dbVersion =
    body && typeof body.dbVersion === 'string' && body.dbVersion.trim() ? body.dbVersion.trim() : 'pg14'

  const id = `seed-${randomUUID()}`
  const now = new Date().toISOString()
  const item = {
    id,
    mine: true,
    name,
    oteName: name,
    product: 'CaseOne',
    type: envTypeName,
    status: OTE_STATUS.RUNNING,
    instances: { ready: 0, total: 1 },
    lastOperation: { kind: 'start', label: 'Старт' },
    updatedAt: now,
    caseOneVersion,
    history: [{ at: now, text: 'Создание окружения (вы)' }],
    lastBuild: null,
    instancesDetail: [],
    source: 'seed',
  }

  await recordAuditEvent(
    auditPayloadFromUser(user, {
      actionCode: AUDIT_ACTION.OTE_CREATE,
      oteResourceId: id,
      oteTag: name,
      details: { envTypeName, caseOneVersion, deployTemplate, dbVersion },
    }),
  )

  return { item }
})
