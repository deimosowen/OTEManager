import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteDeploymentTemplates } from '../../../db/schema.js'
import { mapDeploymentTemplateFull } from '../../../utils/deployment-template-map.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

function parseTemplateId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

export default defineEventHandler(async (event) => {
  requireOteUser(event)
  const id = parseTemplateId(event.context.params?.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Некорректный id' })
  }
  const db = getDb()
  const rows = await db.select().from(oteDeploymentTemplates).where(eq(oteDeploymentTemplates.id, id)).limit(1)
  const row = rows[0]
  if (!row) {
    throw createError({ statusCode: 404, message: 'Шаблон не найден' })
  }
  return { template: mapDeploymentTemplateFull(row) }
})
