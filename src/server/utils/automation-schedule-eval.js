/** Логика моментов запуска по расписанию (не дублировать сюда формулировки для экрана пользователя). */
import { DateTime } from 'luxon'
import {
  LEGACY_AUTOMATION_SCHEDULE_TIMEZONE,
  normalizeAutomationScheduleConfig,
  resolveAutomationScheduleWeekdays,
} from '@app-constants/automation-schedule.js'
import { fetchIsDayOffRuStatus } from './isdayoff-ru.js'
import { getTimezoneForUserLoginKey, isValidIanaTimeZone } from './user-settings.js'

/**
 * @param {string} yyyymmdd
 * @param {string} timezone
 * @param {(d: string, tz: string) => Promise<string>} fetchFn
 * @param {Map<string, Promise<string>> | undefined} cache
 */
async function resolveIsDayOffCached(yyyymmdd, timezone, fetchFn, cache) {
  const key = `${yyyymmdd}|${timezone}|RU`
  if (cache) {
    let p = cache.get(key)
    if (!p) {
      p = Promise.resolve()
        .then(() => fetchFn(yyyymmdd, timezone))
        .catch(() => /** @type {const} */ ('unknown'))
      cache.set(key, p)
    }
    return p
  }
  try {
    return await fetchFn(yyyymmdd, timezone)
  } catch {
    return 'unknown'
  }
}

/**
 * IANA-зона для проверки слота: явная в конфиге → профиль автора последнего сохранения → наследие МСК.
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {Record<string, unknown>} config
 * @param {string} scenarioUpdatedByUserKey
 */
export async function resolveScheduleTimezoneForFire(db, config, scenarioUpdatedByUserKey) {
  const n = normalizeAutomationScheduleConfig(config)
  if (n.timezone && isValidIanaTimeZone(n.timezone)) return n.timezone.trim()
  const fromProfile = await getTimezoneForUserLoginKey(db, scenarioUpdatedByUserKey)
  if (fromProfile && isValidIanaTimeZone(fromProfile)) return fromProfile.trim()
  return LEGACY_AUTOMATION_SCHEDULE_TIMEZONE
}

/**
 * Ключ одного слота в UTC (начало минуты «настенных» часов после перевода из зоны расписания).
 *
 * @param {number} nowMillis
 * @param {string} timezone IANA
 */
export function computeScheduleSlotKeyUtc(nowMillis, timezone) {
  return DateTime.fromMillis(nowMillis, { zone: 'utc' })
    .setZone(timezone)
    .startOf('minute')
    .toUTC()
    .toISO()
}

/**
 * Совпадает ли текущая минута в зоне расписания с правилами.
 * Режим «рабочие дни» — производственный календарь РФ (isdayoff.ru); при сбое API день считается рабочим.
 *
 * @param {number} nowMillis
 * @param {string} timezone IANA
 * @param {Record<string, unknown>} config
 * @param {{
 *   fetchIsDayOffRu?: (yyyymmdd: string, timezone: string) => Promise<string>,
 *   isDayOffCache?: Map<string, Promise<string>>,
 * }} [deps]
 */
export async function isWallClockMatchingSchedule(nowMillis, timezone, config, deps = {}) {
  const n = normalizeAutomationScheduleConfig(config)
  const wall = DateTime.fromMillis(nowMillis, { zone: 'utc' }).setZone(timezone).startOf('minute')
  const hm = wall.toFormat('HH:mm')
  if (!n.times.includes(hm)) return false

  if (n.dayMode === 'calendar') {
    const weekdays = resolveAutomationScheduleWeekdays(n)
    return weekdays.includes(wall.weekday)
  }

  const ymd = wall.toFormat('yyyyMMdd')
  const fetchFn = deps.fetchIsDayOffRu ?? fetchIsDayOffRuStatus
  const status = await resolveIsDayOffCached(ymd, timezone, fetchFn, deps.isDayOffCache)
  if (status === 'nonworking') return false
  return true
}

/**
 * @param {string | null | undefined} rawJson
 * @returns {Record<string, string>}
 */
export function parseScheduleLastFiredMap(rawJson) {
  if (!rawJson || typeof rawJson !== 'string') return {}
  try {
    const o = JSON.parse(rawJson)
    if (!o || typeof o !== 'object') return {}
    /** @type {Record<string, string>} */
    const out = {}
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && v) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}
