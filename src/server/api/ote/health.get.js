import { collectHealthPayload } from '../../utils/health-check.js'
import { assertHealthAccess, healthAccessPolicy } from '../../utils/require-health-access.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'

/**
 * Сводка состояния сервисов для админ-страницы (БД, Yandex Cloud, TeamCity с персональным токеном).
 * Доступ: см. `NUXT_HEALTH_ADMIN_EMAILS` в `require-health-access.js`.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const config = useRuntimeConfig(event)
  assertHealthAccess(config, user)
  const payload = await collectHealthPayload(config, user)
  return {
    accessPolicy: healthAccessPolicy(config),
    ...payload,
  }
})
