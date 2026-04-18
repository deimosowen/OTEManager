import { getCookie, deleteCookie } from 'h3'
import {
  OTE_RETURN_COOKIE,
  OTE_STATE_COOKIE,
  setOteSession,
} from '../../../utils/ote-session'
import { assertAllowedEmailDomain, exchangeYandexCode, fetchYandexLoginInfo } from '../../../utils/yandex-oauth'
import { safeReturnPath } from '../../../utils/safe-return-path'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '')
  const redirectUri = `${siteUrl}/api/auth/yandex/callback`

  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const err = typeof query.error === 'string' ? query.error : ''

  const clearOAuthCookies = () => {
    deleteCookie(event, OTE_STATE_COOKIE, { path: '/' })
    deleteCookie(event, OTE_RETURN_COOKIE, { path: '/' })
  }

  const failRedirect = (message) => {
    clearOAuthCookies()
    const m = encodeURIComponent(message)
    return sendRedirect(event, `/login?error=${m}`, 302)
  }

  if (err) {
    return failRedirect(`Яндекс: ${err}`)
  }

  const savedState = getCookie(event, OTE_STATE_COOKIE)
  if (!savedState || !state || savedState !== state) {
    return failRedirect('Неверный или устаревший state OAuth')
  }

  if (!code) {
    return failRedirect('Код авторизации не получен')
  }

  const clientId = config.public.yandexClientId
  const clientSecret = config.yandexClientSecret
  if (!clientId || !clientSecret) {
    return failRedirect('Сервер не настроен для Яндекс OAuth')
  }

  let tokens
  try {
    tokens = await exchangeYandexCode(code, clientId, clientSecret, redirectUri)
  } catch (e) {
    return failRedirect(e?.message || 'Ошибка обмена кода')
  }

  let info
  try {
    info = await fetchYandexLoginInfo(tokens.access_token)
  } catch (e) {
    return failRedirect(e?.message || 'Ошибка профиля')
  }

  let email = info.default_email || ''
  if (!email && Array.isArray(info.emails) && info.emails.length) {
    const first = info.emails[0]
    email = typeof first === 'string' ? first : first?.value || ''
  }

  try {
    assertAllowedEmailDomain(config.allowedEmailDomains, email)
  } catch (e) {
    return failRedirect(e?.message || e?.statusMessage || 'Домен email не разрешён')
  }

  const name = info.display_name || info.real_name || info.login || email || 'Пользователь'
  const avatarId = info.default_avatar_id || null

  if (!config.sessionSecret) {
    return failRedirect('Задайте NUXT_SESSION_SECRET в .env')
  }

  const returnTo = getCookie(event, OTE_RETURN_COOKIE) || '/'

  setOteSession(event, {
    sub: String(info.id),
    login: info.login || '',
    email: email || '',
    name,
    avatarId,
  })

  clearOAuthCookies()

  const safe = safeReturnPath(returnTo)
  return sendRedirect(event, safe, 302)
})
