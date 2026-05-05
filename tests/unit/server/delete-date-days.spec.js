import { describe, it, expect, vi, afterEach } from 'vitest'
import { daysLifeFromTodayUtc } from '~/server/utils/teamcity/delete-date-days.js'

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
