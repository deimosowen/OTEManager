import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { userNotifications } from '../../../db/schema.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

function parseId(raw) {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const key = integrationUserKey(user)
  if (!key) throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя' })

  const id = parseId(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, message: 'Некорректный id' })

  const db = getDb()
  const res = await db
    .delete(userNotifications)
    .where(and(eq(userNotifications.id, id), eq(userNotifications.userKey, key)))
    .returning({ id: userNotifications.id })

  if (!res.length) throw createError({ statusCode: 404, message: 'Уведомление не найдено' })
  return { ok: true }
})
