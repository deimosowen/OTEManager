/**
 * Найти плейсхолдеры вида `%some.key%` (ключ не содержит пробелов/переводов строк).
 * @param {string} yaml
 */
export function extractPercentPlaceholders(yaml) {
  const s = String(yaml || '')
  /** @type {Set<string>} */
  const set = new Set()
  const re = /%([^%\s\r\n]+)%/g
  let m
  while ((m = re.exec(s))) {
    const key = String(m[1] || '').trim()
    if (key) set.add(key)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'))
}

/**
 * Рендер `%key%` → params[key]. Бросает Error, если не хватает значений.
 * @param {string} yaml
 * @param {Record<string, string>} params
 */
export function renderYamlPercentPlaceholders(yaml, params) {
  const placeholders = extractPercentPlaceholders(yaml)
  const missing = placeholders.filter((k) => !(k in params))
  if (missing.length) {
    const head = missing.slice(0, 12)
    const more = missing.length > head.length ? ` (+${missing.length - head.length})` : ''
    throw new Error(`Не заданы параметры для YAML: ${head.join(', ')}${more}`)
  }
  return String(yaml || '').replace(/%([^%\s\r\n]+)%/g, (_all, key) => {
    const k = String(key || '').trim()
    return params[k] != null ? String(params[k]) : ''
  })
}

