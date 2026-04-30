import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import { getCookie, setCookie, deleteCookie } from 'h3'

export const OTE_SESSION_COOKIE = 'ote_session'
export const OTE_STATE_COOKIE = 'yandex_oauth_state'
export const OTE_RETURN_COOKIE = 'yandex_oauth_return'

const MAX_AGE_SEC = 60 * 60 * 24 * 7

/**
 * @param {import('h3').H3Event} event
 * @param {Record<string, unknown>} payload
 */
export function setOteSession(event, payload) {
  const config = useRuntimeConfig(event)
  const secret = config.sessionSecret
  if (!secret) {
    throw createError({ statusCode: 500, message: 'sessionSecret не задан' })
  }
  const now = Math.floor(Date.now() / 1000)
  const body = {
    ...payload,
    iat: now,
    exp: now + MAX_AGE_SEC,
  }
  const token = signPayload(body, secret)
  const secure = Boolean(config.public.siteUrl?.startsWith('https://'))
  setCookie(event, OTE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
  })
}

/**
 * @param {import('h3').H3Event} event
 * @returns {Record<string, unknown> | null}
 */
export function readOteSession(event) {
  const config = useRuntimeConfig(event)
  const secret = config.sessionSecret
  const token = getCookie(event, OTE_SESSION_COOKIE)
  if (!token || !secret) return null
  return verifyToken(token, secret)
}

/**
 * Публичный объект пользователя для API и event.context (см. /api/auth/session).
 * Поле `timezone` (IANA) подставляется в middleware и `/api/auth/session` из таблицы `user_settings`.
 * @param {Record<string, unknown> | null} session
 */
export function mapOteSessionToPublicUser(session) {
  if (!session?.sub) return null
  const avatarId = session.avatarId || null
  return {
    id: String(session.sub),
    login: session.login || '',
    email: session.email || '',
    name: session.name || 'Пользователь',
    avatarId,
    avatarUrl: avatarId ? `https://avatars.yandex.net/get-yapic/${avatarId}/islands-34` : null,
  }
}

/**
 * @param {import('h3').H3Event} event
 */
export function clearOteSession(event) {
  deleteCookie(event, OTE_SESSION_COOKIE, { path: '/' })
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} secret
 */
function signPayload(obj, secret) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

/**
 * @param {string} token
 * @param {string} secret
 */
function verifyToken(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}

export function randomState() {
  return randomBytes(24).toString('hex')
}
