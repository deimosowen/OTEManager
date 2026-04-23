import { runtimeConfigString } from '../yc/config-helpers.js'

/**
 * Убрать случайно вставленный префикс `Bearer ` при вставке токена из буфера.
 * @param {unknown} raw
 */
export function normalizeTeamCityPat(raw) {
  let t = String(raw ?? '').trim()
  if (/^bearer\s+/i.test(t)) t = t.slice(7).trim()
  return t
}

/**
 * Personal Access Token для REST TeamCity: JetBrains задаёт заголовок `Authorization: Bearer &lt;value&gt;`
 * (см. описание поля `value` у сущности Token в справке REST).
 * @param {string} token
 * @returns {string} заголовок `Authorization` или пусто
 */
export function teamCityBearerFromPat(token) {
  const t = normalizeTeamCityPat(token)
  if (!t) return ''
  return `Bearer ${t}`
}

/**
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @returns {string}
 */
export function teamCityRestBaseUrl(config) {
  return (
    runtimeConfigString(config.tcRestBaseUrl, 'NUXT_TC_REST_BASE_URL').replace(/\/+$/, '') ||
    'https://ci.pravo.tech'
  )
}

/**
 * TeamCity: PAT — `Authorization: Bearer` (актуальная схема JetBrains для REST).
 * Либо пара логин/пароль — Basic.
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @returns {string} заголовок `Authorization` или пусто
 */
export function teamCityAuthorizationHeader(config) {
  const token = normalizeTeamCityPat(runtimeConfigString(config.tcAccessToken, 'NUXT_TC_ACCESS_TOKEN'))
  if (token) {
    return teamCityBearerFromPat(token)
  }
  const u = runtimeConfigString(config.tcUsername, 'NUXT_TC_USERNAME')
  const p = runtimeConfigString(config.tcPassword, 'NUXT_TC_PASSWORD')
  if (p || u) {
    return `Basic ${Buffer.from(`${u || ''}:${p || ''}`, 'utf8').toString('base64')}`
  }
  return ''
}

/**
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 */
export function isTeamCityConfigured(config) {
  return Boolean(teamCityAuthorizationHeader(config))
}
