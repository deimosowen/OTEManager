import { eq } from 'drizzle-orm'
import { getDb } from '../../../../db/client.js'
import { oteTcCreations } from '../../../../db/schema.js'
import { integrationUserKey } from '../../../../utils/integrations/user-credentials.js'
import { syncOteTcCreationRow } from '../../../../utils/ote-tc-creation-sync.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'

function parseId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

function canAccessCreationRow(user, row) {
  const key = integrationUserKey(user)
  if (row.actorLogin === key) return true
  const em = String(user?.email || '').trim()
  return Boolean(em && row.actorEmail === em)
}

/**
 * Состояние запроса на создание OTE + синхронизация с TeamCity.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = parseId(event.context.params?.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Некорректный id' })
  }

  const db = getDb()
  const rows = await db.select().from(oteTcCreations).where(eq(oteTcCreations.id, id)).limit(1)
  const row = rows[0]
  if (!row) {
    throw createError({ statusCode: 404, message: 'Запись не найдена' })
  }
  if (!canAccessCreationRow(user, row)) {
    throw createError({ statusCode: 403, message: 'Нет доступа к этой записи' })
  }

  const config = useRuntimeConfig(event)
  return { creation: await syncOteTcCreationRow(config, user, row) }
})
