import { fetchTeamCityBuildSnapshot } from './client.js'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Итог терминальной сборки по полям REST (state/status).
 * @param {string | undefined} status
 * @param {string | undefined} state
 * @returns {'success'|'failure'}
 */
export function classifyTeamCityTerminalOutcome(status, state) {
  const st = String(status || '').toUpperCase().trim()
  if (st === 'SUCCESS') return 'success'
  if (['FAILURE', 'ERROR', 'CANCELED', 'CANCELLED'].includes(st)) return 'failure'
  const s = String(state || '').toLowerCase().trim()
  if (s === 'finished') return 'success'
  if (['failed', 'failure'].includes(s)) return 'failure'
  return 'failure'
}

/**
 * Дождаться завершения всех указанных сборок (явный терминальный статус в REST).
 *
 * @param {{
 *   buildIds: string[],
 *   baseUrl: string,
 *   authorization: string,
 *   timeoutMs?: number,
 *   pollMs?: number,
 * }} opts
 * @returns {Promise<{ allSuccess: boolean, reason: string }>}
 */
export async function waitForTeamCityBuildsOutcome(opts) {
  const { baseUrl, authorization, timeoutMs = 7200000, pollMs = 4000 } = opts
  const ids = [...new Set((opts.buildIds || []).map(String).map((x) => x.trim()).filter(Boolean))]
  if (!ids.length) return { allSuccess: false, reason: 'no_build_ids' }

  const deadline = Date.now() + timeoutMs
  /** @type {Map<string, 'pending'|'success'|'failure'>} */
  const st = new Map(ids.map((id) => [id, 'pending']))

  while (Date.now() < deadline) {
    for (const id of ids) {
      if (st.get(id) !== 'pending') continue
      const snap = await fetchTeamCityBuildSnapshot({ buildId: id, baseUrl, authorization })
      if (!snap || !snap.terminal) continue
      st.set(id, classifyTeamCityTerminalOutcome(snap.status, snap.state))
    }
    const vals = [...st.values()]
    if (!vals.includes('pending')) {
      const anyFail = vals.some((x) => x === 'failure')
      return { allSuccess: !anyFail, reason: anyFail ? 'build_failed' : 'ok' }
    }
    await sleep(pollMs)
  }
  return { allSuccess: false, reason: 'timeout' }
}
