/** Настройки блоков «Запуск / остановка ВМ» в автоматизациях. */

export const VM_POWER_TARGET_OPTIONS = [
  { value: 'mine', label: 'Только мои среды' },
  { value: 'tag', label: 'По имени среды (тег в каталоге)' },
]

/**
 * @param {unknown} raw
 * @returns {{
 *   blockTitle: string,
 *   targetMode: 'mine' | 'tag',
 *   tagValue: string,
 * }}
 */
export function normalizeVmPowerConfig(raw) {
  const blockTitle = String(raw?.blockTitle ?? '').trim()
  const targetMode = raw?.targetMode === 'tag' ? 'tag' : 'mine'
  let tagValue = String(raw?.tagValue ?? '').trim()
  if (targetMode !== 'tag') tagValue = ''
  return { blockTitle, targetMode, tagValue }
}

/**
 * @param {unknown} raw
 * @param {'start_mine' | 'stop_mine'} variant
 */
export function summarizeVmPowerConfig(raw, variant) {
  const c = normalizeVmPowerConfig(raw)
  const action = variant === 'start_mine' ? 'Запуск' : 'Остановка'
  if (c.targetMode === 'tag') {
    const t = c.tagValue ? `«${c.tagValue.length > 28 ? `${c.tagValue.slice(0, 28)}…` : c.tagValue}»` : 'тег не задан'
    return `${action}: по тегу ${t}`
  }
  return `${action}: мои среды`
}
