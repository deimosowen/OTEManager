import { getDb } from '../db/client.js'
import { readOteSession, mapOteSessionToPublicUser } from '../utils/ote-session'
import { attachRbacToPublicUser } from '../utils/rbac/bootstrap.js'
import { attachTimezoneToPublicUser } from '../utils/user-settings.js'

/**
 * Для каждого входящего запроса (кроме API) кладём пользователя в event.context —
 * плагин Nuxt читает это на SSR без отдельного HTTP к JSON-эндпоинту сессии.
 */
export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (path.startsWith('/api/')) return
  if (path.startsWith('/_nuxt')) return
  if (path.startsWith('/__nuxt')) return
  if (path.startsWith('/.well-known/')) return

  try {
    const session = readOteSession(event)
    const base = mapOteSessionToPublicUser(session)
    let user = base ? await attachTimezoneToPublicUser(base) : null
    if (user) {
      const db = getDb()
      const config = useRuntimeConfig(event)
      user = await attachRbacToPublicUser(db, config, user)
    }
    event.context.oteUser = user
  } catch {
    event.context.oteUser = null
  }
})
