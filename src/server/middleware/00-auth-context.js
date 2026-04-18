import { readOteSession, mapOteSessionToPublicUser } from '../utils/ote-session'

/**
 * Для каждого входящего запроса (кроме API) кладём пользователя в event.context —
 * плагин Nuxt читает это на SSR без отдельного HTTP к JSON-эндпоинту сессии.
 */
export default defineEventHandler((event) => {
  const path = event.path || ''
  if (path.startsWith('/api/')) return
  if (path.startsWith('/_nuxt')) return
  if (path.startsWith('/__nuxt')) return
  if (path.startsWith('/.well-known/')) return

  try {
    const session = readOteSession(event)
    event.context.oteUser = mapOteSessionToPublicUser(session)
  } catch {
    event.context.oteUser = null
  }
})
