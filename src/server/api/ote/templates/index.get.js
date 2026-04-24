import {
  DEPLOYMENT_TEMPLATE_OS,
  normalizeDeploymentTemplateOsFilter,
} from '@app-constants/deployment-template-os.js'
import { and, desc, eq, or } from 'drizzle-orm'
import { getQuery } from 'h3'
import { getDb } from '../../../db/client.js'
import { oteDeploymentTemplates } from '../../../db/schema.js'
import { whereDeploymentTemplateVisibleToUser } from '../../../utils/deployment-template-access.js'
import { mapDeploymentTemplateSummary } from '../../../utils/deployment-template-map.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const me = integrationUserKey(user)
  const q = getQuery(event)
  const raw = typeof q.forOs === 'string' ? q.forOs : typeof q.os === 'string' ? q.os : ''
  const osFilter = normalizeDeploymentTemplateOsFilter(raw)

  const rawPersonal = typeof q.personal === 'string' ? q.personal.trim().toLowerCase() : ''
  const personalFilter = rawPersonal === 'yes' || rawPersonal === 'no' ? rawPersonal : 'all'

  const visibility = whereDeploymentTemplateVisibleToUser(me)
  let scope = visibility
  if (personalFilter === 'yes') {
    scope = and(visibility, eq(oteDeploymentTemplates.isPersonal, 1))
  } else if (personalFilter === 'no') {
    scope = and(visibility, eq(oteDeploymentTemplates.isPersonal, 0))
  }

  const osWhere =
    osFilter === DEPLOYMENT_TEMPLATE_OS.WINDOWS || osFilter === DEPLOYMENT_TEMPLATE_OS.LINUX
      ? or(
          eq(oteDeploymentTemplates.targetOs, DEPLOYMENT_TEMPLATE_OS.ALL),
          eq(oteDeploymentTemplates.targetOs, osFilter),
        )
      : null

  const combined = osWhere ? and(scope, osWhere) : scope

  const db = getDb()
  const order = desc(oteDeploymentTemplates.updatedAt)
  const rows = await db.select().from(oteDeploymentTemplates).where(combined).orderBy(order)

  return { templates: rows.map(mapDeploymentTemplateSummary) }
})
