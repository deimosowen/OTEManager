import { describe, expect, it } from 'vitest'
import { fetchIsDayOffRuStatus, parseIsDayOffRuBody } from '../../../src/server/utils/isdayoff-ru.js'

describe('isdayoff-ru', () => {
  it('parseIsDayOffRuBody: рабочие и сокращённый день', () => {
    expect(parseIsDayOffRuBody('0')).toBe('working')
    expect(parseIsDayOffRuBody('2')).toBe('working')
    expect(parseIsDayOffRuBody('4')).toBe('working')
  })

  it('parseIsDayOffRuBody: нерабочий и праздник', () => {
    expect(parseIsDayOffRuBody('1')).toBe('nonworking')
    expect(parseIsDayOffRuBody('8')).toBe('nonworking')
  })

  it('parseIsDayOffRuBody: ошибки API и мусор → unknown', () => {
    expect(parseIsDayOffRuBody('')).toBe('unknown')
    expect(parseIsDayOffRuBody('100')).toBe('unknown')
    expect(parseIsDayOffRuBody('199')).toBe('unknown')
    expect(parseIsDayOffRuBody('bad')).toBe('unknown')
    expect(parseIsDayOffRuBody('\uFEFF0')).toBe('working')
  })

  it('fetchIsDayOffRuStatus: не-OK и неверная дата не роняют вызов', async () => {
    const badHttp = async () => ({ ok: false, status: 503, text: async () => '199' })
    await expect(fetchIsDayOffRuStatus('20260509', 'Europe/Moscow', badHttp)).resolves.toBe('unknown')

    await expect(fetchIsDayOffRuStatus('bad', 'Europe/Moscow', badHttp)).resolves.toBe('unknown')

    const okWeekend = async () => ({ ok: true, status: 200, text: async () => '1' })
    await expect(fetchIsDayOffRuStatus('20260509', 'Europe/Moscow', okWeekend)).resolves.toBe('nonworking')
  })
})
