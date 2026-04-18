import { setCookie } from 'h3'
import { OTE_RETURN_COOKIE, OTE_STATE_COOKIE, randomState } from '../../utils/ote-session'
import { safeReturnPath } from '../../utils/safe-return-path'

/**
 * Старт OAuth: редирект на Яндекс (как GET /auth/yandex в Mattermost_CaseOneBot).
 * Опционально: ?return=/some-path — куда вернуться после входа.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const clientId = config.public.yandexClientId
  const secret = config.yandexClientSecret
  if (!clientId || !secret) {
    throw createError({
      statusCode: 503,
      message: 'OAuth Яндекса не настроен (NUXT_PUBLIC_YANDEX_CLIENT_ID / NUXT_YANDEX_CLIENT_SECRET)',
    })
  }

  const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '')
  const redirectUri = `${siteUrl}/api/auth/yandex/callback`

  const state = randomState()
  const secure = siteUrl.startsWith('https://')

  setCookie(event, OTE_STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  const q = getQuery(event)
  const ret = typeof q.return === 'string' ? q.return : '/'
  const safeReturn = safeReturnPath(ret)
  setCookie(event, OTE_RETURN_COOKIE, safeReturn, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  const url = new URL('https://oauth.yandex.ru/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'login:info login:email')

  return sendRedirect(event, url.toString(), 302)
})
