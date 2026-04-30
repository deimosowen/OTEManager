import { readOteSession, mapOteSessionToPublicUser } from '../../utils/ote-session'
import { attachTimezoneToPublicUser } from '../../utils/user-settings.js'

export default defineEventHandler(async (event) => {
  const session = readOteSession(event)
  const base = mapOteSessionToPublicUser(session)
  const user = base ? await attachTimezoneToPublicUser(base) : null
  return { user }
})
