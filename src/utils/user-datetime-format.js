/**
 * Чистые функции отображения дат в заданной IANA-таймзоне (сервер сохраняет UTC).
 *
 * Новые экраны: импорт отсюда + `timeZone` из `useUserTimeFormat()` или `auth.user.timezone`.
 */
import { DEFAULT_USER_TIMEZONE } from '~/constants/user-timezone'

/**
 * @param {unknown} value ISO-строка, epoch ms или Date
 * @returns {Date | null}
 */
export function parseDisplayInstant(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value)
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * @param {unknown} value
 * @param {string} [timeZone]
 * @returns {string}
 */
export function formatUserDate(value, timeZone = DEFAULT_USER_TIMEZONE) {
  const d = parseDisplayInstant(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Дата и время (часы:минуты).
 * @param {unknown} value
 * @param {string} [timeZone]
 */
export function formatUserDateTime(value, timeZone = DEFAULT_USER_TIMEZONE) {
  const d = parseDisplayInstant(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Как в таблицах аудита: `YYYY-MM-DD HH:mm:ss` в выбранной зоне (моноширинно).
 * @param {unknown} value
 * @param {string} [timeZone]
 */
export function formatUserDateTimeSeconds(value, timeZone = DEFAULT_USER_TIMEZONE) {
  const d = parseDisplayInstant(value)
  if (!d) return '—'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const g = (t) => parts.find((p) => p.type === t)?.value || ''
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}:${g('second')}`
}

/**
 * Как «29 04 2026, 15:30:45 GMT+3» для подписей вроде health / «Обновлено».
 * @param {unknown} value
 * @param {string} [timeZone]
 */
export function formatUserDateTimeMedium(value, timeZone = DEFAULT_USER_TIMEZONE) {
  const d = parseDisplayInstant(value)
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZoneName: 'shortOffset',
    }).format(d)
  } catch {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(d)
  }
}
