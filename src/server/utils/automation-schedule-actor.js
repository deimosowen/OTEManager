import { eq } from 'drizzle-orm'
import { oteDirectoryUsers } from '../db/schema.js'

/**
 * Пользователь каталога для запуска сценария по расписанию (учётка последнего сохранения графа).
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} userKey
 * @returns {Promise<{ id?: string, login?: string, email?: string } | null>}
 */
export async function fetchDirectoryUserByKey(db, userKey) {
  const key = String(userKey || '').trim()
  if (!key) return null
  const rows = await db
    .select({
      userKey: oteDirectoryUsers.userKey,
      login: oteDirectoryUsers.login,
      email: oteDirectoryUsers.email,
    })
    .from(oteDirectoryUsers)
    .where(eq(oteDirectoryUsers.userKey, key))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    id: String(r.userKey || ''),
    login: String(r.login || '').trim(),
    email: String(r.email || '').trim(),
  }
}
