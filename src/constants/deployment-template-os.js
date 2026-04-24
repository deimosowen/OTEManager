/** Значения в БД / API: для какой ОС подходит шаблон деплоя. */
export const DEPLOYMENT_TEMPLATE_OS = /** @type {const} */ ({
  ALL: 'all',
  WINDOWS: 'windows',
  LINUX: 'linux',
})

/** @type {{ value: string, label: string }[]} */
export const DEPLOYMENT_TEMPLATE_OS_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
]

/**
 * @param {string | undefined | null} raw
 * @returns {'all'|'windows'|'linux'|null} null — без фильтра
 */
export function normalizeDeploymentTemplateOsFilter(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'windows' || v === 'linux') return v
  if (v === 'all') return 'all'
  return null
}

/**
 * @param {string | undefined | null} raw
 * @returns {'all'|'windows'|'linux'}
 */
export function parseDeploymentTemplateOsValue(raw) {
  const v = normalizeDeploymentTemplateOsFilter(raw)
  return v === 'windows' || v === 'linux' ? v : 'all'
}

/** Подпись для таблицы / карточки. */
export function labelDeploymentTemplateOs(value) {
  const v = String(value || '').toLowerCase()
  const o = DEPLOYMENT_TEMPLATE_OS_OPTIONS.find((x) => x.value === v)
  return o ? o.label : value || '—'
}
