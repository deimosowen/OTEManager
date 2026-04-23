import { readOteSession, mapOteSessionToPublicUser } from './ote-session.js'

/**
 * @param {import('h3').H3Event} event
 */
export function requireOteUser(event) {
  const session = readOteSession(event)
  const user = mapOteSessionToPublicUser(session)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Требуется вход' })
  }
  return user
}
