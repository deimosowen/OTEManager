/**
 * Разбор значений, склеенных на сервере через « / » при нескольких ВМ в одной строке OTE.
 * @param {unknown} raw
 * @returns {string[]}
 */
export function splitOteGroupedFieldSegments(raw) {
  if (raw === undefined || raw === null) return []
  const s = String(raw).trim()
  if (!s || s === '—') return []
  return s.split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean)
}
