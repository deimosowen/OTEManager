import { getDb } from '../../../db/client.js'
import { getBuildTemplateShortcutsPayload } from '../../../utils/build-template-shortcuts.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const me = integrationUserKey(user)
  const db = getDb()
  return getBuildTemplateShortcutsPayload(db, me)
})
