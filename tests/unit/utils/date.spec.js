import { describe, it, expect } from 'vitest'
import { formatDateRu, formatDateTimeRu } from '~/utils/date'

describe('formatDateRu', () => {
  it('форматирует валидную ISO-дату', () => {
    const s = formatDateRu('2024-12-23T10:00:00.000Z')
    expect(s).toMatch(/23[./]12[./]2024/)
  })

  it('возвращает тире для пустого значения', () => {
    expect(formatDateRu('')).toBe('—')
    expect(formatDateRu(null)).toBe('—')
  })

  it('возвращает тире для невалидной строки', () => {
    expect(formatDateRu('not-a-date')).toBe('—')
  })
})

describe('formatDateTimeRu', () => {
  it('возвращает строку для валидной даты', () => {
    const s = formatDateTimeRu('2024-12-23T10:00:00.000Z')
    expect(s.length).toBeGreaterThan(8)
    expect(s).toContain('2024')
  })
})
