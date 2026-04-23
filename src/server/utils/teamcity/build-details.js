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
 * Карта name → value из resultingProperties сборки (Actual parameters on agent в UI).
 * @param {Record<string, unknown> | null} buildRoot
 */
export function parseResultingPropertiesMap(buildRoot) {
  if (!buildRoot || typeof buildRoot !== 'object') return {}
  const rp = buildRoot.resultingProperties
  if (!rp || typeof rp !== 'object') return {}
  const raw = rp.property
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
 * Полный JSON сборки (для resultingProperties).
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
  const url = `${baseUrl}/app/rest/builds/id:${encodeURIComponent(id)}`
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
