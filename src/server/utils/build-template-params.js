const MAX_KEY_LEN = 256
const MAX_VAL_LEN = 2_000_000
const MAX_PAIRS = 300

/**
 * Нормализовать и проверить объект параметров key/value (строки).
 * @param {unknown} raw
 * @returns {Record<string, string>}
 */
export function parseBuildTemplateParams(raw) {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? /** @type {Record<string, unknown>} */ (raw) : null
  if (!obj) return {}

  /** @type {Record<string, string>} */
  const out = {}
  const keys = Object.keys(obj)
  if (keys.length > MAX_PAIRS) {
    throw new Error(`Слишком много параметров (максимум ${MAX_PAIRS})`)
  }
  for (const kRaw of keys) {
    const k = String(kRaw || '').trim()
    if (!k) continue
    if (k.length > MAX_KEY_LEN) throw new Error(`Слишком длинное имя параметра: ${k.slice(0, 80)}…`)
    const vRaw = obj[kRaw]
    const v = vRaw == null ? '' : String(vRaw)
    out[k] = v.length > MAX_VAL_LEN ? v.slice(0, MAX_VAL_LEN) : v
  }
  return out
}

/**
 * Слить базовые params и overrides (overrides побеждают).
 * @param {Record<string, string>} base
 * @param {unknown} rawOverrides
 */
export function mergeBuildTemplateOverrides(base, rawOverrides) {
  const overrides = parseBuildTemplateParams(rawOverrides)
  return { ...base, ...overrides }
}

