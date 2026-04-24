/**
 * Разбор `deploymentTemplateId` из тела запроса (создание OTE, сохранённые конфигурации).
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseDeploymentTemplateId(raw) {
  if (raw == null) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = Math.trunc(raw)
    return n > 0 ? n : null
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const n = parseInt(raw.trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}
