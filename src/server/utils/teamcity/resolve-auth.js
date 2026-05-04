import { INTEGRATION_PROVIDER } from '@app-constants/integrations.js'
import { getDecryptedIntegrationPayload, integrationUserKey } from '../integrations/user-credentials.js'
import { normalizeTeamCityPat, teamCityBearerFromPat } from './config.js'

/**
 * Только персональный PAT из профиля (серверные NUXT_TC_* не используются).
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ userKey?: string, user?: { login?: string, email?: string, id?: string } }} [opts]
 */
export async function resolveTeamCityAuthorizationHeader(config, opts = {}) {
  const userKey = opts.userKey || (opts.user ? integrationUserKey(opts.user) : '')
  if (!userKey) return ''
  const data = await getDecryptedIntegrationPayload(config, userKey, INTEGRATION_PROVIDER.TEAMCITY)
  const tok = data && typeof data.accessToken === 'string' ? normalizeTeamCityPat(data.accessToken) : ''
  return teamCityBearerFromPat(tok)
}

/**
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ userKey?: string, user?: { login?: string, email?: string, id?: string } }} [opts]
 */
export async function isTeamCityAuthAvailable(config, opts = {}) {
  const h = await resolveTeamCityAuthorizationHeader(config, opts)
  return Boolean(h)
}
