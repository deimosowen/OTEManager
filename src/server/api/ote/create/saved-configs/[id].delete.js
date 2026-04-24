import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../db/client.js'
import { oteCreateSavedConfigs } from '../../../../db/schema.js'
import { integrationUserKey } from '../../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'

function parseId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = parseId(event.context.params?.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Некорректный id' })
  }
  const login = integrationUserKey(user)
  const db = getDb()
  const [row] = await db
    .delete(oteCreateSavedConfigs)
    .where(and(eq(oteCreateSavedConfigs.id, id), eq(oteCreateSavedConfigs.actorLogin, login)))
    .returning({ id: oteCreateSavedConfigs.id })

  if (!row) {
    throw createError({ statusCode: 404, message: 'Конфигурация не найдена' })
  }
  return { ok: true }
})
