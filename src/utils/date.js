/**
 * Только обратная совместимость: без профиля считаем отображение в UTC.
 * Новый код — `useUserTimeFormat()` или импорт из `~/utils/user-datetime-format`.
 */
import { DEFAULT_USER_TIMEZONE } from '~/constants/user-timezone'
import { formatUserDate, formatUserDateTime } from './user-datetime-format'

/** @deprecated `useUserTimeFormat().formatDate` */
export function formatDateRu(iso) {
  return formatUserDate(iso, DEFAULT_USER_TIMEZONE)
}

/** @deprecated `useUserTimeFormat().formatDateTime` */
export function formatDateTimeRu(iso) {
  return formatUserDateTime(iso, DEFAULT_USER_TIMEZONE)
}
