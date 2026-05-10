/**
 * HTTP-запрос из сценария автоматизации (конфиг уже с подстановками vars).
 */

/**
 * @param {string} hostname
 */
function hostnameLooksPrivate(hostname) {
  const h = String(hostname || '').toLowerCase().trim()
  if (!h) return true
  if (h === 'localhost' || h === '0.0.0.0') return true
  if (h === '::1') return true
  if (h.endsWith('.localhost') || h.endsWith('.local')) return true

  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (a === 127) return true
    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    /** Link-local IPv4 (в т.ч. cloud metadata 169.254.169.254) */
    if (a === 169 && b === 254) return true
    if (a === 0) return true
  }
  return false
}

function automationHttpAllowPrivateHosts() {
  return String(process.env.AUTOMATION_HTTP_ALLOW_PRIVATE || '').trim() === '1'
}

/**
 * @param {Record<string, unknown>} interpolatedCfg
 * @returns {Promise<{
 *   ok: boolean,
 *   status?: number,
 *   statusText?: string,
 *   bodyText?: string,
 *   json?: unknown,
 *   error?: string,
 * }>}
 */
export async function executeAutomationHttpRequest(interpolatedCfg) {
  const methodRaw = String(interpolatedCfg.method || 'GET').trim().toUpperCase()
  const allowed = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'])
  if (!allowed.has(methodRaw)) {
    return { ok: false, error: `Недопустимый метод HTTP: ${methodRaw}` }
  }

  const urlRaw = String(interpolatedCfg.url || '').trim()
  if (!urlRaw) {
    return { ok: false, error: 'Пустой URL' }
  }

  /** @type {URL} */
  let u
  try {
    u = new URL(urlRaw)
  } catch {
    return { ok: false, error: 'Некорректный URL' }
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'Разрешены только схемы http и https' }
  }

  if (!automationHttpAllowPrivateHosts() && hostnameLooksPrivate(u.hostname)) {
    return {
      ok: false,
      error:
        'Запросы к локальным и частным адресам запрещены. Для разработки задайте AUTOMATION_HTTP_ALLOW_PRIVATE=1.',
    }
  }

  const timeoutMs = Math.min(120_000, Math.max(1000, Number(interpolatedCfg.timeoutMs) || 30_000))

  const headers = new Headers()
  const hdrList = Array.isArray(interpolatedCfg.headers) ? interpolatedCfg.headers : []
  /** Запрет подмены транспортных заголовков из сценария */
  const forbiddenHeaderNames = new Set([
    'host',
    'connection',
    'content-length',
    'transfer-encoding',
    'keep-alive',
    'proxy-connection',
    'te',
    'trailer',
    'upgrade',
  ])
  for (const row of hdrList) {
    if (!row || typeof row !== 'object') continue
    let k = String(/** @type {Record<string, unknown>} */ (row).key || '')
      .trim()
      .replace(/\r|\n/g, '')
    if (!k) continue
    if (forbiddenHeaderNames.has(k.toLowerCase())) continue
    const v = String(/** @type {Record<string, unknown>} */ (row).value ?? '').replace(/\r|\n/g, '')
    headers.set(k, v)
  }

  /** @type {string | undefined} */
  let body
  if (methodRaw !== 'GET' && methodRaw !== 'HEAD') {
    const b = interpolatedCfg.body
    const s = b == null ? '' : String(b)
    if (s.trim()) body = s
  }

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    /** Без автоматических редиректов — иначе возможен SSRF на link-local/metadata после 302. */
    const res = await fetch(urlRaw, {
      method: methodRaw,
      headers,
      body,
      redirect: 'manual',
      signal: ac.signal,
    })
    const bodyTextRaw = await res.text()
    const maxLen = 256 * 1024
    const bodyText =
      bodyTextRaw.length > maxLen ? `${bodyTextRaw.slice(0, maxLen)}\n… [тело ответа усечено]` : bodyTextRaw

    /** @type {unknown} */
    let json = null
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      try {
        json = JSON.parse(bodyText)
      } catch {
        json = null
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      bodyText,
      json,
    }
  } catch (e) {
    const name = e?.name || ''
    return {
      ok: false,
      error: name === 'AbortError' ? `Таймаут запроса (${timeoutMs} ms)` : e?.message || String(e),
    }
  } finally {
    clearTimeout(timer)
  }
}
