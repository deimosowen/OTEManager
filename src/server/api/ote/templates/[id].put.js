import { AUDIT_ACTION } from '@app-constants/audit.js'
import { parseDeploymentTemplateOsValue } from '@app-constants/deployment-template-os.js'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteDeploymentTemplates } from '../../../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../utils/audit-log.js'
import { parseIsPersonalFromBody, rowIsPersonal } from '../../../utils/deployment-template-access.js'
import { mapDeploymentTemplateFull } from '../../../utils/deployment-template-map.js'
import { assertValidYamlString } from '../../../utils/deployment-template-yaml.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

function parseTemplateId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = parseTemplateId(event.context.params?.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Некорректный id' })
  }

  const body = await readBody(event)
  const name =
    body && typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 256) : ''
  if (!name) {
    throw createError({ statusCode: 400, message: 'Укажите название шаблона' })
  }
  const description =
    body && typeof body.description === 'string' ? body.description.trim().slice(0, 4000) : ''
  const yamlRaw = body && typeof body.yaml === 'string' ? body.yaml : ''
  const yamlBody = assertValidYamlString(yamlRaw)

  const db = getDb()
  const login = integrationUserKey(user)
  const email = String(user.email || '').trim()

  const prevRows = await db.select().from(oteDeploymentTemplates).where(eq(oteDeploymentTemplates.id, id)).limit(1)
  const prev = prevRows[0]
  if (!prev) {
    throw createError({ statusCode: 404, message: 'Шаблон не найден' })
  }
  if (rowIsPersonal(prev.isPersonal) && prev.createdByLogin !== login) {
    throw createError({ statusCode: 403, message: 'Личный шаблон может изменять только автор' })
  }

  let nextIsPersonal = rowIsPersonal(prev.isPersonal)
  if (prev.createdByLogin === login && body && typeof body === 'object' && 'isPersonal' in body) {
    nextIsPersonal = parseIsPersonalFromBody(body)
  }

  const now = new Date()
  const [row] = await db
    .update(oteDeploymentTemplates)
    .set({
      name,
      description: description || null,
      yamlBody,
      isPersonal: nextIsPersonal ? 1 : 0,
      updatedAt: now,
      updatedByLogin: login,
      updatedByEmail: email,
      ...(body && typeof body === 'object' && 'targetOs' in body
        ? { targetOs: parseDeploymentTemplateOsValue(body.targetOs) }
        : {}),
    })
    .where(eq(oteDeploymentTemplates.id, id))
    .returning()

  if (!row) {
    throw createError({ statusCode: 404, message: 'Шаблон не найден' })
  }

  if (!rowIsPersonal(row.isPersonal)) {
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: AUDIT_ACTION.OTE_DEPLOY_TEMPLATE_UPDATE,
        oteResourceId: `deploy-template:${row.id}`,
        oteTag: row.name,
        details: { templateId: row.id, name: row.name },
      }),
    )
  }

  return { template: mapDeploymentTemplateFull(row) }
})
