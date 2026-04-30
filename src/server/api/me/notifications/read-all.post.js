import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { userNotifications } from '../../../db/schema.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

/** Пометить все уведомления пользователя как прочитанные. */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const key = integrationUserKey(user)
  if (!key) throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя' })

  const db = getDb()
  const now = new Date()
  await db
    .update(userNotifications)
    .set({ readAt: now })
    .where(and(eq(userNotifications.userKey, key), isNull(userNotifications.readAt)))

  return { ok: true }
})
