/**
 * Число календарных дней «жизни» OTE до даты автоудаления (от сегодняшнего дня UTC).
 * `deleteDateYmd` — строка YYYY-MM-DD (дата в календаре).
 *
 * @param {string} deleteDateYmd
 * @returns {number}
 */
export function daysLifeFromTodayUtc(deleteDateYmd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(deleteDateYmd ?? '').trim())
  if (!m) return NaN
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return NaN
  const now = new Date()
  const t0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const t1 = Date.UTC(y, mo - 1, d)
  return Math.round((t1 - t0) / 86400000)
}

/**
 * Календарная дата UTC в формате YYYY-MM-DD через `days` полных суток от сегодняшнего UTC-дня.
 *
 * @param {number} days
 * @returns {string}
 */
export function utcCalendarDatePlusDaysFromToday(days) {
  const n = Number(days)
  if (!Number.isFinite(n)) return ''
  const now = new Date()
  const ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + n)
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}
