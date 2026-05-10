/** Блок «Ожидание завершения сборки TeamCity» на холсте автоматизаций */

/**
 * @param {unknown} raw
 * @returns {{ blockTitle: string, timeoutMinutes: number }}
 */
export function normalizeWaitTeamCityConfig(raw) {
  const blockTitle = String(raw?.blockTitle ?? '').trim() || 'Ожидание TeamCity'
  let timeoutMinutes = Number(raw?.timeoutMinutes)
  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes < 1) timeoutMinutes = 180
  if (timeoutMinutes > 24 * 60) timeoutMinutes = 24 * 60
  return { blockTitle, timeoutMinutes }
}

/**
 * @param {unknown} raw
 */
export function summarizeWaitTeamCityConfig(raw) {
  const c = normalizeWaitTeamCityConfig(raw)
  return `До ${c.timeoutMinutes} мин`
}
