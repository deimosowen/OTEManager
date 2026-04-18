/**
 * OAuth 2.0 Яндекс ID (аналогично passport-yandex + обмен code).
 * @see https://yandex.ru/dev/id/doc/ru/codes/code-url
 */

const TOKEN_URL = 'https://oauth.yandex.ru/token'
const INFO_URL = 'https://login.yandex.ru/info?format=json'

/**
 * @param {string} code
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} redirectUri
 */
export async function exchangeYandexCode(code, clientId, clientSecret, redirectUri) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
  })
  /** Яндекс ожидает redirect_uri при обмене кода */
  body.set('redirect_uri', redirectUri)

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const text = await res.text()
  if (!res.ok) {
    console.error('[yandex-oauth] token error', res.status, text)
    throw createError({
      statusCode: 502,
      message: 'Не удалось обменять код на токен Яндекса',
    })
  }
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw createError({ statusCode: 502, message: 'Некорректный ответ токена Яндекса' })
  }
  if (!data.access_token) {
    throw createError({ statusCode: 502, message: 'В ответе Яндекса нет access_token' })
  }
  return data
}

/**
 * @param {string} accessToken
 */
export async function fetchYandexLoginInfo(accessToken) {
  const res = await fetch(INFO_URL, {
    headers: { Authorization: `OAuth ${accessToken}` },
  })
  if (!res.ok) {
    const t = await res.text()
    console.error('[yandex-oauth] info error', res.status, t)
    throw createError({ statusCode: 502, message: 'Не удалось получить профиль Яндекса' })
  }
  return res.json()
}

/**
 * @param {string | undefined} raw comma-separated domains, lowercase check
 * @param {string} email
 */
export function assertAllowedEmailDomain(raw, email) {
  if (!raw || !String(raw).trim()) return
  const domain = (email || '').split('@')[1]?.toLowerCase()
  if (!domain) {
    throw createError({ statusCode: 403, message: 'В профиле Яндекса нет email' })
  }
  const allowed = String(raw)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (!allowed.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    throw createError({
      statusCode: 403,
      message: `Доступ только для доменов: ${allowed.join(', ')}`,
    })
  }
}
