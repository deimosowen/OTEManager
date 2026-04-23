import { INTEGRATION_PROVIDER } from '@app-constants/integrations.js'
import { deleteUserIntegration, integrationUserKey } from '../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'

/** Удалить токен TeamCity. Аудит не пишем. */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const key = integrationUserKey(user)
  if (!key) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя с записью интеграции' })
  }
  await deleteUserIntegration(key, INTEGRATION_PROVIDER.TEAMCITY)
  return { ok: true }
})
