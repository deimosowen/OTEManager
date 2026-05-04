/** Максимум символов лога в ответе API (хвост лога при обрезке). */
const DEFAULT_MAX_LOG_CHARS = 900_000

/**
 * Текст лога сборки TeamCity (downloadBuildLog.html + plain=true).
 * При превышении лимита возвращается хвост лога.
 *
 * @param {{
 *   baseUrl: string,
 *   buildId: string,
 *   authorization: string,
 *   maxChars?: number,
 * }} opts
 * @returns {Promise<{ text: string, truncated: boolean, httpStatus: number, error: string | null }>}
 */
export async function fetchTeamCityBuildLogPlain(opts) {
  const { buildId, authorization, baseUrl, maxChars = DEFAULT_MAX_LOG_CHARS } = opts
  const id = String(buildId || '').trim()
  if (!id) {
    return { text: '', truncated: false, httpStatus: 0, error: 'no_build_id' }
  }
  if (!authorization) {
    return { text: '', truncated: false, httpStatus: 0, error: 'no_auth' }
  }

  const b = String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '')
  if (!b) {
    return { text: '', truncated: false, httpStatus: 0, error: 'no_base_url' }
  }
  /** Обход прокси/браузерного кэша GET: лог должен быть актуальным при каждом опросе */
  const nocache = `plain=true&_=${Date.now()}`
  const url = `${b}/downloadBuildLog.html?buildId=${encodeURIComponent(id)}&${nocache}`

  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: authorization,
      Accept: 'text/plain, */*',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  })

  const text = await res.text()

  if (!res.ok) {
    return {
      text: '',
      truncated: false,
      httpStatus: res.status,
      error: res.status === 404 ? 'log_not_ready' : `http_${res.status}`,
    }
  }

  let out = text
  let truncated = false
  if (out.length > maxChars) {
    truncated = true
    out = out.slice(-maxChars)
  }

  return { text: out, truncated, httpStatus: res.status, error: null }
}
