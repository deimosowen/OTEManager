import { desc } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteDeploymentTemplates } from '../../../db/schema.js'
import { mapDeploymentTemplateSummary } from '../../../utils/deployment-template-map.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  requireOteUser(event)
  const db = getDb()
  const rows = await db
    .select()
    .from(oteDeploymentTemplates)
    .orderBy(desc(oteDeploymentTemplates.updatedAt))
  return { templates: rows.map(mapDeploymentTemplateSummary) }
})
