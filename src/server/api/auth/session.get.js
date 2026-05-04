import { getDb } from '../../db/client.js'
import { readOteSession, mapOteSessionToPublicUser } from '../../utils/ote-session'
import { attachRbacToPublicUser } from '../../utils/rbac/bootstrap.js'
import { attachTimezoneToPublicUser } from '../../utils/user-settings.js'

export default defineEventHandler(async (event) => {
  const session = readOteSession(event)
  const base = mapOteSessionToPublicUser(session)
  let user = base ? await attachTimezoneToPublicUser(base) : null
  if (user) {
    const db = getDb()
    const config = useRuntimeConfig(event)
    user = await attachRbacToPublicUser(db, config, user)
  }
  return { user }
})
