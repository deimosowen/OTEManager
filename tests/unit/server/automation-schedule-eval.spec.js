import { describe, expect, it } from 'vitest'
import {
  computeScheduleSlotKeyUtc,
  isWallClockMatchingSchedule,
  parseScheduleLastFiredMap,
} from '../../../src/server/utils/automation-schedule-eval.js'

describe('automation-schedule-eval', () => {
  it('совпадение понедельника 09:00 в Europe/Moscow (календарный режим)', async () => {
    const cfg = { dayMode: 'calendar', weekdays: [1], times: ['09:00'], timezone: 'Europe/Moscow' }
    const ms = Date.parse('2026-05-04T06:00:00.000Z')
    await expect(isWallClockMatchingSchedule(ms, 'Europe/Moscow', cfg)).resolves.toBe(true)
  })

  it('не совпадает другой день недели', async () => {
    const cfg = { dayMode: 'calendar', weekdays: [2], times: ['09:00'], timezone: 'Europe/Moscow' }
    const ms = Date.parse('2026-05-04T06:00:00.000Z')
    await expect(isWallClockMatchingSchedule(ms, 'Europe/Moscow', cfg)).resolves.toBe(false)
  })

  it('рабочие дни: календарь РФ через мок isdayoff', async () => {
    const cfg = { dayMode: 'working', weekdays: [7], times: ['09:00'], timezone: 'UTC' }
    const sunday = Date.parse('2026-05-03T09:00:00.000Z')
    await expect(
      isWallClockMatchingSchedule(sunday, 'UTC', cfg, {
        fetchIsDayOffRu: async () => 'nonworking',
      }),
    ).resolves.toBe(false)

    const monday = Date.parse('2026-05-04T09:00:00.000Z')
    await expect(
      isWallClockMatchingSchedule(monday, 'UTC', cfg, {
        fetchIsDayOffRu: async () => 'working',
      }),
    ).resolves.toBe(true)
  })

  it('рабочие дни: при unknown от API день считается рабочим', async () => {
    const cfg = { dayMode: 'working', weekdays: [7], times: ['09:00'], timezone: 'UTC' }
    const sunday = Date.parse('2026-05-03T09:00:00.000Z')
    await expect(
      isWallClockMatchingSchedule(sunday, 'UTC', cfg, {
        fetchIsDayOffRu: async () => 'unknown',
      }),
    ).resolves.toBe(true)
  })

  it('рабочие дни: кэш на тик не дублирует запросы', async () => {
    const cfg = { dayMode: 'working', weekdays: [1], times: ['09:00'], timezone: 'UTC' }
    const monday = Date.parse('2026-05-04T09:00:00.000Z')
    let calls = 0
    const fetchIsDayOffRu = async () => {
      calls += 1
      return 'working'
    }
    const isDayOffCache = new Map()
    await isWallClockMatchingSchedule(monday, 'UTC', cfg, { fetchIsDayOffRu, isDayOffCache })
    await isWallClockMatchingSchedule(monday, 'UTC', cfg, { fetchIsDayOffRu, isDayOffCache })
    expect(calls).toBe(1)
  })

  it('computeScheduleSlotKeyUtc нормализует минуту', () => {
    const tz = 'Europe/Moscow'
    const ms = Date.parse('2026-05-04T06:30:15.000Z')
    expect(computeScheduleSlotKeyUtc(ms, tz)).toBe(computeScheduleSlotKeyUtc(ms + 12_000, tz))
  })

  it('parseScheduleLastFiredMap', () => {
    expect(parseScheduleLastFiredMap('')).toEqual({})
    expect(parseScheduleLastFiredMap(null)).toEqual({})
    expect(parseScheduleLastFiredMap('{"b-1":"2026-05-04T06:00:00.000Z"}')).toEqual({
      'b-1': '2026-05-04T06:00:00.000Z',
    })
  })
})
