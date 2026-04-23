import { INTEGRATION_PROVIDER } from '@app-constants/integrations.js'
import { hasUserIntegration, integrationUserKey } from '../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'
import { isTeamCityAuthAvailable } from '../../utils/teamcity/resolve-auth.js'

/**
 * Состояние токена TeamCity (без секрета). Аудит не пишем.
 * Путь без вложенного `/integrations/…`, чтобы dev не путал с маршрутами Vue.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const config = useRuntimeConfig(event)
  const key = integrationUserKey(user)
  const tokenSaved = await hasUserIntegration(key, INTEGRATION_PROVIDER.TEAMCITY)
  const ready = await isTeamCityAuthAvailable(config, { user })
  return { teamcity: { tokenSaved, ready } }
})
