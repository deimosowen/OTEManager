import { readOteSession, mapOteSessionToPublicUser } from '../../utils/ote-session'

export default defineEventHandler((event) => {
  const session = readOteSession(event)
  return { user: mapOteSessionToPublicUser(session) }
})
