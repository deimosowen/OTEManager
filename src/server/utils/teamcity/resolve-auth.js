import { INTEGRATION_PROVIDER } from '@app-constants/integrations.js'
import { getDecryptedIntegrationPayload, integrationUserKey } from '../integrations/user-credentials.js'
import { normalizeTeamCityPat, teamCityAuthorizationHeader, teamCityBearerFromPat } from './config.js'

/**
 * Сначала токен пользователя из БД (если передан user / userKey), затем серверный env.
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ userKey?: string, user?: { login?: string, email?: string, id?: string } }} [opts]
 */
export async function resolveTeamCityAuthorizationHeader(config, opts = {}) {
  const userKey = opts.userKey || (opts.user ? integrationUserKey(opts.user) : '')
  if (userKey) {
    const data = await getDecryptedIntegrationPayload(config, userKey, INTEGRATION_PROVIDER.TEAMCITY)
    const tok = data && typeof data.accessToken === 'string' ? normalizeTeamCityPat(data.accessToken) : ''
    const fromUser = teamCityBearerFromPat(tok)
    if (fromUser) return fromUser
  }
  return teamCityAuthorizationHeader(config)
}

/**
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ userKey?: string, user?: { login?: string, email?: string, id?: string } }} [opts]
 */
export async function isTeamCityAuthAvailable(config, opts = {}) {
  const h = await resolveTeamCityAuthorizationHeader(config, opts)
  return Boolean(h)
}
