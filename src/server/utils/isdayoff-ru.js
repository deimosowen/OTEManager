/**
 * Производственный календарь РФ через API isdayoff.ru (документация: https://www.isdayoff.ru/docs/).
 * При любой ошибке или неожиданном ответе считаем день рабочим — расписание не блокируем.
 */

/** @typedef {'working' | 'nonworking' | 'unknown'} IsDayOffStatus */

export const ISDAYOFF_RU_TIMEOUT_MS = 5000

export const ISDAYOFF_RU_USER_AGENT = 'OTEManager/1.0 (automation-schedule)'

/**
 * Разбор тела ответа (одна цифра — код дня; несколько — код ошибки API).
 * @param {string} text
 * @returns {IsDayOffStatus}
 */
export function parseIsDayOffRuBody(text) {
  const s = String(text ?? '')
    .trim()
    .replace(/^\uFEFF/, '')
  if (!s) return 'unknown'
  if (s.length !== 1 || !/\d/.test(s)) return 'unknown'
  // 0 рабочий, 2 сокращённый, 4 рабочий (covid-режим в документации)
  if (s === '0' || s === '2' || s === '4') return 'working'
  // 1 выходной/нерабочий, 8 праздничный (при запросе с holiday=1; без параметра тоже встречается)
  if (s === '1' || s === '8') return 'nonworking'
  return 'unknown'
}

/**
 * @param {string} yyyymmdd формат YYYYMMDD
 * @param {string} timezone IANA (Europe/Moscow и т.д.)
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<IsDayOffStatus>}
 */
export async function fetchIsDayOffRuStatus(yyyymmdd, timezone, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') return 'unknown'
  const date = String(yyyymmdd || '').trim()
  const tz = String(timezone || '').trim()
  if (!/^\d{8}$/.test(date) || !tz) return 'unknown'

  const url = `https://isdayoff.ru/${date}?cc=RU&tz=${encodeURIComponent(tz)}`
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ISDAYOFF_RU_TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      signal: ac.signal,
      headers: {
        Accept: 'text/plain',
        'User-Agent': ISDAYOFF_RU_USER_AGENT,
      },
    })
    if (!res.ok) return 'unknown'
    const text = await res.text()
    return parseIsDayOffRuBody(text)
  } catch {
    return 'unknown'
  } finally {
    clearTimeout(timer)
  }
}
