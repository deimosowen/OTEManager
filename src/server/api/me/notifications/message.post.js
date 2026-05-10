import { createError, defineEventHandler, readBody } from 'h3'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'
import { insertAutomationBellNotification } from '../../../utils/user-notifications.js'

/**
 * Создать уведомление в колокольчике (для действия сценария автоматизации и ручных проверок).
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const userKey = integrationUserKey(user)
  if (!userKey) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя' })
  }

  const body = await readBody(event).catch(() => ({}))
  const notification = await insertAutomationBellNotification(userKey, {
    title: body?.title,
    body: body?.body,
    href: body?.href,
  })
  if (!notification) {
    throw createError({ statusCode: 400, message: 'Укажите заголовок уведомления' })
  }
  return { ok: true, notification }
})
