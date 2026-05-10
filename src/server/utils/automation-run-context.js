/**
 * Контекст выполнения сценария: подстановки {{ путь }} в конфигах блоков и слияние выходов узлов в vars.
 * В шаблонах путь задаётся от корня vars: {{ b_12.teamCityBuildId }} или {{ vars.b_12.teamCityBuildId }} (префикс из id узла).
 */

/**
 * @param {unknown} raw
 * @param {string} fallback
 */
export function sanitizeAutomationContextKey(raw, fallback = 'ctx') {
  let s = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 48)
  if (!s) return fallback
  if (/^\d/.test(s)) s = `_${s}`
  return s
}

/**
 * @param {unknown} obj
 * @param {string} pathStr dot-separated, например b_12.teamCityBuildId или b_12.json.id
 */
export function getAutomationVarByPath(obj, pathStr) {
  const parts = String(pathStr || '')
    .trim()
    .split('.')
    .map((p) => p.trim())
    .filter(Boolean)
  let cur = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    if (!Object.prototype.hasOwnProperty.call(cur, p)) return undefined
    cur = /** @type {Record<string, unknown>} */ (cur)[p]
  }
  return cur
}

/**
 * @param {string} str
 * @param {Record<string, unknown>} vars
 */
export function interpolateAutomationTemplate(str, vars) {
  if (typeof str !== 'string' || !str.includes('{{')) return str
  return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expr) => {
    let path = String(expr || '').trim()
    if (path.startsWith('vars.')) path = path.slice(5).trim()
    const v = getAutomationVarByPath(vars, path)
    if (v === undefined || v === null) return ''
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v)
      } catch {
        return String(v)
      }
    }
    return String(v)
  })
}

/**
 * @param {unknown} value
 * @param {Record<string, unknown>} vars
 */
export function interpolateAutomationDeep(value, vars) {
  if (typeof value === 'string') return interpolateAutomationTemplate(value, vars)
  if (Array.isArray(value)) return value.map((x) => interpolateAutomationDeep(x, vars))
  if (value && typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = interpolateAutomationDeep(v, vars)
    }
    return out
  }
  return value
}

/**
 * @typedef {{ vars: Record<string, unknown> }} AutomationRunContext
 */

/**
 * @param {AutomationRunContext} runContext
 * @param {unknown} contextKey
 * @param {Record<string, unknown>} outputs
 */
export function mergeAutomationOutputs(runContext, contextKey, outputs) {
  const key = sanitizeAutomationContextKey(contextKey, 'ctx')
  const prev = runContext.vars[key]
  const base = prev && typeof prev === 'object' && !Array.isArray(prev) ? { ...prev } : {}
  runContext.vars[key] = { ...base, ...outputs }
}

/**
 * Усечь большие поля перед отдачей в API ответа run-manual.
 *
 * @param {Record<string, unknown>} vars
 */
export function cloneAutomationVarsForApi(vars) {
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const [ns, val] of Object.entries(vars || {})) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) {
      out[ns] = val
      continue
    }
    const copy = { ...val }
    if (typeof copy.bodyText === 'string' && copy.bodyText.length > 8000) {
      copy.bodyText = `${copy.bodyText.slice(0, 8000)}\n… [усечено для ответа API]`
    }
    out[ns] = copy
  }
  return out
}
