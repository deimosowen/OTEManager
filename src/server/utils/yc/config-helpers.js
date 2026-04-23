/**
 * Берёт строковое значение из runtimeConfig или напрямую из process.env.
 * Nuxt иногда отдаёт вложенный объект вместо строки для ключей вида `yc*`.
 * @param {unknown} configValue
 * @param {string} envKey например NUXT_YC_SA_KEY_PATH
 */
export function runtimeConfigString(configValue, envKey) {
  if (typeof configValue === 'string' && configValue.trim()) return configValue.trim()
  if (configValue !== undefined && configValue !== null && typeof configValue !== 'object') {
    const s = String(configValue).trim()
    if (s) return s
  }
  const e = process.env[envKey]
  return typeof e === 'string' ? e.trim() : ''
}
