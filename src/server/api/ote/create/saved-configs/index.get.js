import { desc, eq } from 'drizzle-orm'
import { getDb } from '../../../../db/client.js'
import { oteCreateSavedConfigs } from '../../../../db/schema.js'
import { integrationUserKey } from '../../../../utils/integrations/user-credentials.js'
import { mapOteCreateSavedConfigRow } from '../../../../utils/ote-create-saved-config-properties.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const login = integrationUserKey(user)
  const db = getDb()
  const rows = await db
    .select()
    .from(oteCreateSavedConfigs)
    .where(eq(oteCreateSavedConfigs.actorLogin, login))
    .orderBy(desc(oteCreateSavedConfigs.updatedAt))
  return { configs: rows.map(mapOteCreateSavedConfigRow) }
})
