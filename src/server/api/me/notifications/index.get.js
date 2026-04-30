import { and, count, desc, eq, isNull } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { userNotifications } from '../../../db/schema.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'
import { mapUserNotificationRow } from '../../../utils/user-notification-map.js'

/** Список уведомлений и число непрочитанных. */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const key = integrationUserKey(user)
  if (!key) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя' })
  }

  const db = getDb()
  const rows = await db
    .select()
    .from(userNotifications)
    .where(eq(userNotifications.userKey, key))
    .orderBy(desc(userNotifications.createdAt))
    .limit(80)

  const [unreadRow] = await db
    .select({ n: count() })
    .from(userNotifications)
    .where(and(eq(userNotifications.userKey, key), isNull(userNotifications.readAt)))

  return {
    items: rows.map(mapUserNotificationRow),
    unreadCount: Number(unreadRow?.n) || 0,
  }
})
