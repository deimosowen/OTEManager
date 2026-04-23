import { AUDIT_ACTION } from '@app-constants/audit.js'
import { getDb } from '../../../db/client.js'
import { oteDeploymentTemplates } from '../../../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../utils/audit-log.js'
import { mapDeploymentTemplateFull } from '../../../utils/deployment-template-map.js'
import { assertValidYamlString } from '../../../utils/deployment-template-yaml.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
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
    .insert(oteDeploymentTemplates)
    .values({
      name,
      description: description || null,
      yamlBody,
      createdAt: now,
      updatedAt: now,
      createdByLogin: login,
      createdByEmail: email,
      updatedByLogin: login,
      updatedByEmail: email,
    })
    .returning()

  if (!row) {
    throw createError({ statusCode: 500, message: 'Не удалось сохранить шаблон' })
  }

  await recordAuditEvent(
    auditPayloadFromUser(user, {
      actionCode: AUDIT_ACTION.OTE_DEPLOY_TEMPLATE_CREATE,
      oteResourceId: `deploy-template:${row.id}`,
      oteTag: row.name,
      details: { templateId: row.id, name: row.name },
    }),
  )

  return { template: mapDeploymentTemplateFull(row) }
})
