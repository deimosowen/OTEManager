import { createError } from 'h3'
import { runtimeConfigString } from './yc/config-helpers.js'

/**
 * Доступ к `/api/ote/health` и странице состояния.
 * `NUXT_HEALTH_ADMIN_EMAILS` — список почт через запятую/точку с запятой (без учёта регистра).
 * Если список пуст — достаточно любой авторизованной сессии (удобно для внутренней сети; в проде задайте список).
 *
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ email?: string }} user
 */
export function assertHealthAccess(config, user) {
  const raw = runtimeConfigString(config.healthAdminEmails, 'NUXT_HEALTH_ADMIN_EMAILS')
  const list = raw
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (!list.length) return
  const email = String(user?.email || '').trim().toLowerCase()
  if (!email || !list.includes(email)) {
    throw createError({
      statusCode: 403,
      message: 'Нет доступа к мониторингу состояния. Обратитесь к администратору или добавьте почту в NUXT_HEALTH_ADMIN_EMAILS.',
    })
  }
}

/**
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 */
export function healthAccessPolicy(config) {
  const raw = runtimeConfigString(config.healthAdminEmails, 'NUXT_HEALTH_ADMIN_EMAILS')
  const list = raw
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean)
  return list.length ? 'admins_only' : 'all_authenticated'
}
