import { getDb } from '../../../db/client.js'
import { getBuildTemplateShortcutsPayload } from '../../../utils/build-template-shortcuts.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const db = getDb()
  const config = useRuntimeConfig(event)
  return await getBuildTemplateShortcutsPayload(db, config, user)
})
