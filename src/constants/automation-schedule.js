/**
 * Данные расписания триггера (день недели + время + пояс для пользователя).
 * Подписи в интерфейсе держим бытовыми; детали реализации — только во внутренних утилитах сервера.
 */

/** Старые сценарии без поля timezone создавались под подписью «МСК». */
export const LEGACY_AUTOMATION_SCHEDULE_TIMEZONE = 'Europe/Moscow'

const WEEKDAY_SHORT = /** @type {Record<number, string>} */ ({
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
  7: 'Вс',
})

/**
 * @param {number[]} nums
 */
export function weekdaysSummaryRu(nums) {
  return [...nums]
    .sort((a, b) => a - b)
    .map((n) => WEEKDAY_SHORT[n] || String(n))
    .join(', ')
}

/**
 * @param {string} tz IANA
 */
export function formatTimezoneShortRu(tz) {
  if (!tz || typeof tz !== 'string') return ''
  try {
    const parts = new Intl.DateTimeFormat('ru-RU', {
      timeZone: tz.trim(),
      timeZoneName: 'short',
    }).formatToParts(new Date())
    const name = parts.find((p) => p.type === 'timeZoneName')?.value
    return name && name.trim() ? name.trim() : tz.trim()
  } catch {
    return tz.trim()
  }
}

/**
 * @param {unknown} raw
 * @returns {{ dayMode: 'working'|'calendar', weekdays: number[], times: string[], timezone: string }}
 */
export function normalizeAutomationScheduleConfig(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {}
  const dayMode = obj.dayMode === 'working' ? 'working' : 'calendar'
  const wdRaw = Array.isArray(obj.weekdays) ? obj.weekdays : []
  const weekdays = wdRaw
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 7)
  const tRaw = Array.isArray(obj.times) ? obj.times.map((t) => String(t || '').trim()).filter(Boolean) : []
  const times = [...new Set(tRaw)].sort((a, b) => a.localeCompare(b))
  const timezone = typeof obj.timezone === 'string' ? obj.timezone.trim() : ''
  return {
    dayMode,
    weekdays: weekdays.length ? weekdays : [1, 2, 3, 4, 5],
    times: times.length ? times : ['09:00'],
    timezone,
  }
}

/**
 * Дни недели для срабатывания (Luxon: 1 = пн … 7 = вс).
 * @param {{ dayMode: string, weekdays: number[] }} normalized
 */
export function resolveAutomationScheduleWeekdays(normalized) {
  if (normalized.dayMode === 'working') return [1, 2, 3, 4, 5]
  const u = [...new Set(normalized.weekdays)].filter((n) => n >= 1 && n <= 7).sort((a, b) => a - b)
  return u.length ? u : [1, 2, 3, 4, 5]
}

/**
 * Подпись узла на холсте.
 * @param {Record<string, unknown>} cfg
 * @param {string} tzNote подпись ЧП (например GMT+3 или IANA)
 */
export function summarizeAutomationScheduleConfig(cfg, tzNote) {
  const n = normalizeAutomationScheduleConfig(cfg)
  const times = n.times
  const timePart =
    times.length === 0 ? '' : times.length === 1 ? `в ${times[0]}` : `в ${times.join(', ')}`
  const tz = tzNote && String(tzNote).trim() ? String(tzNote).trim() : ''
  const tzPart = tz ? ` · ${tz}` : ''

  if (n.dayMode === 'working') {
    const dm = 'Рабочие дни · календарь РФ'
    if (!timePart) return `${dm}${tzPart}`
    return `${dm} · ${timePart}${tzPart}`
  }

  const dm = 'Календарные дни'
  const days = weekdaysSummaryRu(resolveAutomationScheduleWeekdays(n))
  if (!timePart) return `${dm} · ${days}${tzPart}`
  return `${dm} · ${days} · ${timePart}${tzPart}`
}
