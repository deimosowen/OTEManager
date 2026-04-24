import { teamCityAuthorizationHeader, teamCityRestBaseUrl } from './config.js'

/**
 * @param {Record<string, unknown> | null} j
 */
function unwrapBuildRoot(j) {
  if (!j || typeof j !== 'object') return null
  const b = j.build
  if (b && typeof b === 'object' && !Array.isArray(b)) return b
  return j
}

/**
 * TeamCity REST: сущность Properties → map name → value.
 * @param {Record<string, unknown> | null} entity
 */
export function parsePropertiesEntity(entity) {
  if (!entity || typeof entity !== 'object') return {}
  const raw = entity.property
  if (!raw) return {}
  const list = Array.isArray(raw) ? raw : [raw]
  /** @type {Record<string, string>} */
  const out = {}
  for (const p of list) {
    if (p && typeof p === 'object' && typeof p.name === 'string') {
      const v = p.value
      out[p.name] = v != null && typeof v !== 'object' ? String(v) : ''
    }
  }
  return out
}

/**
 * Карта name → value из resultingProperties сборки (Actual parameters on agent в UI).
 * @param {Record<string, unknown> | null} buildRoot
 */
export function parseResultingPropertiesMap(buildRoot) {
  if (!buildRoot || typeof buildRoot !== 'object') return {}
  const rp = buildRoot.resultingProperties
  if (rp && typeof rp === 'object') {
    const m = parsePropertiesEntity(rp)
    if (Object.keys(m).length) return m
  }
  return parsePropertiesEntity(buildRoot)
}

/**
 * Снимок resulting parameters: GET сборки с `fields=…resultingProperties` и при необходимости
 * GET `/builds/id:…/resulting-properties` (в корне ответа — Properties).
 * @param {{ config: import('@nuxt/schema').NitroRuntimeConfig, buildId: string, authorization?: string }} opts
 * @returns {Promise<{ httpStatus: number, map: Record<string, string>, raw?: string }>}
 */
export async function fetchTeamCityResultingPropertiesMap(opts) {
  const { config, buildId, authorization: authorizationOverride } = opts
  const id = String(buildId || '').trim()
  if (!id) return { httpStatus: 400, map: {} }
  const baseUrl = teamCityRestBaseUrl(config)
  const authorization = authorizationOverride || teamCityAuthorizationHeader(config)
  if (!authorization) return { httpStatus: 401, map: {} }

  const headers = {
    Authorization: authorization,
    Accept: 'application/json',
  }

  /** Без `fields` TeamCity часто не возвращает resultingProperties в теле сборки. */
  const buildUrl = `${baseUrl}/app/rest/builds/id:${encodeURIComponent(id)}?fields=id,resultingProperties(property(name,value))`
  const res1 = await fetch(buildUrl, { method: 'GET', headers })
  const text1 = await res1.text()

  /** @type {Record<string, string>} */
  let map1 = {}
  if (res1.ok) {
    try {
      const j = JSON.parse(text1)
      map1 = parseResultingPropertiesMap(unwrapBuildRoot(j))
    } catch {
      map1 = {}
    }
  }

  const rpUrl = `${baseUrl}/app/rest/builds/id:${encodeURIComponent(id)}/resulting-properties`
  const res2 = await fetch(rpUrl, { method: 'GET', headers })
  const text2 = await res2.text()

  /** @type {Record<string, string>} */
  let map2 = {}
  if (res2.ok) {
    try {
      map2 = parsePropertiesEntity(JSON.parse(text2))
    } catch {
      map2 = {}
    }
  }

  const map = { ...map1, ...map2 }

  if (res1.ok || res2.ok) {
    return { httpStatus: 200, map }
  }

  const raw = (text2 && text2.trim()) || (text1 && text1.trim()) || ''
  return {
    httpStatus: res2.status || res1.status || 500,
    map,
    raw: raw.length > 500 ? `${raw.slice(0, 500)}…` : raw,
  }
}

/**
 * Полный JSON сборки (опционально с resultingProperties в `fields`).
 * @param {{ config: import('@nuxt/schema').NitroRuntimeConfig, buildId: string, authorization?: string }} opts
 * @returns {Promise<{ httpStatus: number, buildRoot: Record<string, unknown> | null, raw?: string }>}
 */
export async function fetchTeamCityBuildJson(opts) {
  const { config, buildId, authorization: authorizationOverride } = opts
  const id = String(buildId || '').trim()
  if (!id) return { httpStatus: 400, buildRoot: null }
  const baseUrl = teamCityRestBaseUrl(config)
  const authorization = authorizationOverride || teamCityAuthorizationHeader(config)
  if (!authorization) return { httpStatus: 401, buildRoot: null }
  const url = `${baseUrl}/app/rest/builds/id:${encodeURIComponent(id)}?fields=id,status,state,resultingProperties(property(name,value))`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  if (!res.ok) return { httpStatus: res.status, buildRoot: null, raw: text.slice(0, 500) }
  try {
    const j = JSON.parse(text)
    return { httpStatus: res.status, buildRoot: unwrapBuildRoot(j) }
  } catch {
    return { httpStatus: res.status, buildRoot: null, raw: text.slice(0, 500) }
  }
}
