import { INTEGRATION_PROVIDER } from '@app-constants/integrations.js'
import { integrationUserKey, upsertUserIntegrationPayload } from '../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'
import { normalizeTeamCityPat } from '../../utils/teamcity/config.js'

/**
 * Сохранить токен TeamCity. Аудит не пишем.
 * Тело: `{ "token": "<access token>" }`.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const config = useRuntimeConfig(event)
  if (!integrationUserKey(user)) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя с записью интеграции' })
  }
  const body = await readBody(event)
  const token = normalizeTeamCityPat(body && typeof body.token === 'string' ? body.token : '')
  if (token.length < 8) {
    throw createError({ statusCode: 400, message: 'Токен слишком короткий' })
  }
  try {
    await upsertUserIntegrationPayload(config, user, INTEGRATION_PROVIDER.TEAMCITY, { accessToken: token })
  } catch (e) {
    const msg = e?.message || String(e)
    throw createError({ statusCode: 500, message: msg })
  }
  return { ok: true }
})
