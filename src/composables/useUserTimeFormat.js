import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { DEFAULT_USER_TIMEZONE } from '~/constants/user-timezone'
import {
  formatUserDate as fmtDate,
  formatUserDateTime as fmtDt,
  formatUserDateTimeSeconds as fmtDtSec,
  formatUserDateTimeMedium as fmtDtMed,
} from '~/utils/user-datetime-format'

/**
 * Отображение дат в часовом поясе из профиля (`auth.user.timezone`, иначе UTC).
 */
export function useUserTimeFormat() {
  const auth = useAuthStore()
  const timeZone = computed(() => {
    const t = auth.user?.timezone
    return typeof t === 'string' && t.trim() ? t.trim() : DEFAULT_USER_TIMEZONE
  })

  return {
    timeZone,
    formatDate: (value) => fmtDate(value, timeZone.value),
    formatDateTime: (value) => fmtDt(value, timeZone.value),
    /** Табличный формат с секундами */
    formatDateTimeSeconds: (value) => fmtDtSec(value, timeZone.value),
    /** Подписи «когда проверено / обновлено» */
    formatDateTimeMedium: (value) => fmtDtMed(value, timeZone.value),
  }
}
