import { describe, it, expect, vi, afterEach } from 'vitest'
import { daysLifeFromTodayUtc, utcCalendarDatePlusDaysFromToday } from '~/server/utils/teamcity/delete-date-days.js'

describe('daysLifeFromTodayUtc', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('возвращает 1 для завтра (UTC)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2026, 3, 10, 12, 0, 0)))
    expect(daysLifeFromTodayUtc('2026-04-11')).toBe(1)
  })

  it('отклоняет неверный формат', () => {
    expect(Number.isNaN(daysLifeFromTodayUtc('10.04.2026'))).toBe(true)
  })
})

describe('utcCalendarDatePlusDaysFromToday', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('+7 дней совпадает с daysLifeFromTodayUtc', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2026, 5, 1, 8, 0, 0)))
    const ymd = utcCalendarDatePlusDaysFromToday(7)
    expect(ymd).toBe('2026-06-08')
    expect(daysLifeFromTodayUtc(ymd)).toBe(7)
  })
})
