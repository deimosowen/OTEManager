import { AUDIT_ACTION } from '@app-constants/audit.js'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteDeploymentTemplates } from '../../../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../utils/audit-log.js'
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
  const now = new Date()
  const login = integrationUserKey(user)
  const email = String(user.email || '').trim()

  const [row] = await db
    .update(oteDeploymentTemplates)
    .set({
      name,
      description: description || null,
      yamlBody,
      updatedAt: now,
      updatedByLogin: login,
      updatedByEmail: email,
    })
    .where(eq(oteDeploymentTemplates.id, id))
    .returning()

  if (!row) {
    throw createError({ statusCode: 404, message: 'Шаблон не найден' })
  }

  await recordAuditEvent(
    auditPayloadFromUser(user, {
      actionCode: AUDIT_ACTION.OTE_DEPLOY_TEMPLATE_UPDATE,
      oteResourceId: `deploy-template:${row.id}`,
      oteTag: row.name,
      details: { templateId: row.id, name: row.name },
    }),
  )

  return { template: mapDeploymentTemplateFull(row) }
})
