import { and, desc, eq } from 'drizzle-orm'
import { getQuery } from 'h3'
import { getDb } from '../../../db/client.js'
import { oteBuildTemplates } from '../../../db/schema.js'
import { whereBuildTemplateVisibleToUser } from '../../../utils/build-template-access.js'
import { mapBuildTemplateSummary } from '../../../utils/build-template-map.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const me = integrationUserKey(user)
  const q = getQuery(event)

  const rawPersonal = typeof q.personal === 'string' ? q.personal.trim().toLowerCase() : ''
  const personalFilter = rawPersonal === 'yes' || rawPersonal === 'no' ? rawPersonal : 'all'

  const visibility = whereBuildTemplateVisibleToUser(me)
  const scope =
    personalFilter === 'yes'
      ? and(visibility, eq(oteBuildTemplates.isPersonal, 1))
      : personalFilter === 'no'
        ? and(visibility, eq(oteBuildTemplates.isPersonal, 0))
        : visibility

  const db = getDb()
  const rows = await db.select().from(oteBuildTemplates).where(scope).orderBy(desc(oteBuildTemplates.updatedAt))
  return { templates: rows.map(mapBuildTemplateSummary) }
})

