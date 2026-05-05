/**
 * Подпись cookie сессии как в `setOteSession` / `verifyToken` приложения — только для интеграционных тестов.
 */
import { createHmac } from 'node:crypto'

const MAX_AGE_SEC = 60 * 60 * 24 * 7

function signPayload(obj, secret) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

/**
 * @param {Record<string, unknown>} payload
 * @param {string} secret тот же, что `NUXT_SESSION_SECRET` у поднятого Nitro
 */
export function signIntegrationSessionCookie(payload, secret) {
  const s = String(secret || '').trim()
  if (!s) throw new Error('signIntegrationSessionCookie: пустой secret')
  const now = Math.floor(Date.now() / 1000)
  const body = {
    ...payload,
    sub: String(payload?.sub ?? '').trim(),
    iat: now,
    exp: now + MAX_AGE_SEC,
  }
  if (!body.sub) throw new Error('signIntegrationSessionCookie: задайте sub')
  return signPayload(body, s)
}
