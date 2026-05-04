/**
 * @param {unknown} u
 */
function normalizeBaseUrl(u) {
  return String(u ?? '')
    .trim()
    .replace(/\/+$/, '')
}

/**
 * Тело POST /app/rest/buildQueue в формате TeamCity REST (JSON).
 * Важно: многострочные значения (YAML в `default_deploymet_config_template`) нельзя передавать
 * в XML-атрибуте `value="..."` — по правилам XML 1.0 переводы строк в атрибутах нормализуются в пробелы,
 * и YAML превращается в одну строку. В JSON строки переносы кодируются как `\n` и доходят до TC целиком.
 *
 * @param {string} buildTypeId
 * @param {Record<string, string>} properties
 */
function buildQueueRequestJson(buildTypeId, properties) {
  const id = String(buildTypeId || '').trim()
  const entries = Object.entries(properties || {}).filter(([name]) => String(name || '').trim())
  /** @type {Record<string, unknown>} */
  const payload = {
    buildType: { id },
  }
  if (entries.length) {
    payload.properties = {
      property: entries.map(([name, value]) => ({
        name: String(name),
        value: value == null ? '' : String(value),
      })),
    }
  }
  return JSON.stringify(payload)
}

/**
 * Поставить сборку в очередь TeamCity (REST).
 * @param {{
 *   config: import('@nuxt/schema').NitroRuntimeConfig,
 *   baseUrl: string,
 *   buildTypeId: string,
 *   properties: Record<string, string>,
 *   authorization: string,
 * }} opts
 */
export async function queueTeamCityBuild(opts) {
  const { buildTypeId, properties, authorization, baseUrl } = opts
  const b = normalizeBaseUrl(baseUrl)
  if (!b) {
    throw new Error('TeamCity: не задан baseUrl (REST из настроек группы в БД)')
  }
  const auth = String(authorization || '').trim()
  if (!auth) {
    throw new Error('TeamCity: нет авторизации — добавьте персональный токен в профиле (раздел «Интеграции»)')
  }
  if (!buildTypeId || !String(buildTypeId).trim()) {
    throw new Error('TeamCity: не указан buildTypeId')
  }
  const url = `${b}/app/rest/buildQueue`
  const body = buildQueueRequestJson(buildTypeId.trim(), properties)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
  })
  const text = await res.text()
  if (!res.ok) {
    const msg = text.length > 800 ? `${text.slice(0, 800)}…` : text
    throw new Error(`TeamCity HTTP ${res.status}: ${msg}`)
  }
  /** @type {Record<string, unknown> | null} */
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* ответ XML — ниже вытащим id по-простому */
  }
  const buildId = extractBuildIdFromTeamCityQueueResponse(json, text)
  if (json && typeof json === 'object') {
    const webUrl = typeof json.webUrl === 'string' ? json.webUrl : ''
    const state = typeof json.state === 'string' ? json.state : ''
    const href = typeof json.href === 'string' ? json.href : ''
    return { buildId, webUrl, state, href, raw: text }
  }
  const idMatch = text.match(/\bid="(\d+)"/)
  return {
    buildId: buildId || (idMatch ? idMatch[1] : ''),
    webUrl: '',
    state: '',
    href: '',
    raw: text,
  }
}

/**
 * TeamCity часто не кладёт числовой id сборки в корень JSON (есть вложенный `build`, href, webUrl).
 * @param {Record<string, unknown> | null} json
 * @param {string} text
 */
function extractBuildIdFromTeamCityQueueResponse(json, text) {
  /** @param {unknown} v */
  const numericId = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v))
    if (typeof v === 'string') {
      const t = v.trim()
      if (/^\d+$/.test(t)) return t
    }
    return ''
  }
  const fromHref = (s) => {
    if (typeof s !== 'string' || !s) return ''
    const m =
      s.match(/\/app\/rest\/(?:buildQueue|builds)\/id:(\d+)/) ||
      s.match(/[?&]buildId=(\d+)/i) ||
      s.match(/\/build\/[^/]+\/(\d+)(?:\?|#|$)/)
    return m ? m[1] : ''
  }
  const out = []
  if (json && typeof json === 'object') {
    out.push(numericId(json.id))
    const b = json.build
    if (b && typeof b === 'object' && !Array.isArray(b)) out.push(numericId(b.id))
    if (Array.isArray(b)) {
      for (const el of b) {
        if (el && typeof el === 'object') out.push(numericId(el.id))
      }
    }
    const href = json.href
    const webUrl = json.webUrl
    out.push(fromHref(typeof href === 'string' ? href : ''), fromHref(typeof webUrl === 'string' ? webUrl : ''))
  }
  const bodyMatch =
    text.match(/\/app\/rest\/(?:buildQueue|builds)\/id:(\d+)/) || text.match(/[?&]buildId=(\d+)/i)
  if (bodyMatch) out.push(bodyMatch[1])
  for (const x of out) {
    if (x) return x
  }
  const idMatch = text.match(/\bid="(\d+)"/)
  return idMatch ? idMatch[1] : ''
}

/**
 * Достаём state/status из ответа TC (иногда обёртка `build`).
 * @param {Record<string, unknown>} j
 */
function pickTeamCityBuildStateStatus(j) {
  let root = j && typeof j === 'object' ? j : null
  if (root && root.build != null) {
    const b = root.build
    if (Array.isArray(b) && b[0] && typeof b[0] === 'object') root = b[0]
    else if (typeof b === 'object' && !Array.isArray(b)) root = b
  }
  if (!root || typeof root !== 'object') return { state: '', status: '' }
  const rawState = root.state
  const rawStatus = root.status
  const state =
    typeof rawState === 'string'
      ? rawState
      : typeof rawState === 'number'
        ? String(rawState)
        : ''
  const status =
    typeof rawStatus === 'string'
      ? rawStatus
      : typeof rawStatus === 'number'
        ? String(rawStatus)
        : ''
  return { state, status }
}

/**
 * Только явное «сборка в TeamCity закончилась».
 * Не используем логику «не в списке активных ⇒ терминал» — из‑за неё при переходе очередь→агент
 * или нестандартных значениях state блокировка снималась, пока сборка ещё идёт.
 * @param {string} state
 * @param {string} status
 */
function isTeamCityBuildExplicitlyTerminal(state, status) {
  const s = String(state || '').toLowerCase().trim()
  const st = String(status || '').toUpperCase().trim()
  /** Пока сборка в этих состояниях — не терминал (важно при очереди / странном status в REST). */
  if (
    ['queued', 'running', 'not_started', 'starting', 'waiting', 'snapshotting', 'stopping', 'delayed'].includes(s)
  )
    return false
  if (['finished', 'failed', 'failure', 'removed', 'deleted'].includes(s)) return true
  if (['SUCCESS', 'FAILURE', 'ERROR', 'CANCELED', 'CANCELLED'].includes(st)) return true
  return false
}

/**
 * Сборка ещё в очереди TC (после POST /buildQueue id смотрит и buildQueue, и builds).
 * @param {{ baseUrl: string, buildId: string, authorization: string }} opts
 * @returns {Promise<{ terminal: boolean, state?: string, status?: string, httpStatus: number } | null>}
 */
async function fetchTeamCityBuildQueueSnapshot(opts) {
  const { buildId, authorization, baseUrl } = opts
  const id = String(buildId || '').trim()
  if (!id) return null
  const b = normalizeBaseUrl(baseUrl)
  const auth = String(authorization || '').trim()
  if (!b || !auth) return null
  const url = `${b}/app/rest/buildQueue?locator=id:${encodeURIComponent(id)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: auth,
      Accept: 'application/json',
    },
  })
  if (!res.ok) return null
  const text = await res.text()
  try {
    const j = JSON.parse(text)
    let root = j && typeof j === 'object' ? j : null
    if (!root) return null
    if (typeof root.count === 'number' && root.count === 0 && (!root.build || (Array.isArray(root.build) && !root.build.length)))
      return null
    if (root.build != null) {
      const bq = root.build
      if (Array.isArray(bq)) {
        root =
          bq.find((x) => x && typeof x === 'object' && String(x.id ?? '') === id) ||
          (bq[0] && typeof bq[0] === 'object' ? bq[0] : null)
      } else if (typeof bq === 'object') {
        root = bq
      }
    }
    if (!root || typeof root !== 'object') return null
    const { state, status } = pickTeamCityBuildStateStatus({ build: root })
    if (!state && !status && !numericBuildIdPresent(root.id, id)) return null
    return {
      terminal: isTeamCityBuildExplicitlyTerminal(state, status),
      state,
      status,
      httpStatus: res.status,
    }
  } catch {
    return null
  }
}

/**
 * @param {unknown} bid
 * @param {string} expect
 */
function numericBuildIdPresent(bid, expect) {
  const a = String(bid ?? '').trim()
  const b = String(expect || '').trim()
  return Boolean(a && b && a === b)
}

/**
 * Снимок сборки по id (для снятия блокировки UI после завершения/отмены в TC).
 * @param {{ baseUrl: string, buildId: string, authorization: string }} opts
 * @returns {Promise<{ terminal: boolean, state?: string, status?: string, httpStatus: number } | null>}
 */
export async function fetchTeamCityBuildSnapshot(opts) {
  const { buildId, authorization, baseUrl } = opts
  const id = String(buildId || '').trim()
  if (!id) return null
  const b = normalizeBaseUrl(baseUrl)
  const auth = String(authorization || '').trim()
  if (!b || !auth) return null
  const url = `${b}/app/rest/builds/id:${encodeURIComponent(id)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: auth,
      Accept: 'application/json',
    },
  })
  /**
   * 404 при переходе «очередь → агент» или гонках REST не считаем завершением сборки.
   */
  if (res.status === 404) {
    const q = await fetchTeamCityBuildQueueSnapshot({ buildId: id, authorization: auth, baseUrl: b })
    if (q && !q.terminal) return q
    return { terminal: false, state: '', status: '', httpStatus: 404 }
  }
  const text = await res.text()
  if (!res.ok) {
    return { terminal: false, httpStatus: res.status }
  }
  try {
    const j = JSON.parse(text)
    const { state, status } = pickTeamCityBuildStateStatus(j)
    return {
      terminal: isTeamCityBuildExplicitlyTerminal(state, status),
      state,
      status,
      httpStatus: res.status,
    }
  } catch {
    return { terminal: false, httpStatus: res.status }
  }
}
