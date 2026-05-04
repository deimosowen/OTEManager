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
 * Personal Access Token для REST TeamCity: JetBrains задаёт заголовок `Authorization: Bearer <value>`
 * (см. описание поля `value` у сущности Token в справке REST).
 * @param {string} token
 * @returns {string} заголовок `Authorization` или пусто
 */
export function teamCityBearerFromPat(token) {
  const t = normalizeTeamCityPat(token)
  if (!t) return ''
  return `Bearer ${t}`
}
