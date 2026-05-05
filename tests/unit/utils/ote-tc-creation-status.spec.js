import { describe, it, expect } from 'vitest'
import { oteTcCreationStatusClass, oteTcCreationStatusLabel } from '~/utils/ote-tc-creation-status.js'

describe('oteTcCreationStatusLabel', () => {
  it('маппит известные статусы', () => {
    expect(oteTcCreationStatusLabel('queued')).toBe('В очереди')
    expect(oteTcCreationStatusLabel('succeeded')).toBe('Успешно')
  })

  it('возвращает строку для неизвестного', () => {
    expect(oteTcCreationStatusLabel('custom')).toBe('custom')
  })
})

describe('oteTcCreationStatusClass', () => {
  it('разные классы для успеха и ошибки', () => {
    expect(oteTcCreationStatusClass('succeeded')).toContain('emerald')
    expect(oteTcCreationStatusClass('failed')).toContain('rose')
  })
})
