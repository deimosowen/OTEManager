import { getDb } from '../../db/client.js'
import { listAppGroupsOrdered } from '../../utils/ote-app-groups.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'

/** Список групп каталога для форм с привязкой шаблонов (только авторизованные пользователи). */
export default defineEventHandler(async (event) => {
  requireOteUser(event)
  const db = getDb()
  const rows = await listAppGroupsOrdered(db)
  return {
    groups: rows.map((g) => ({
      id: Number(g.id),
      code: String(g.code || ''),
      name: String(g.name || ''),
      isSystem: Boolean(Number(g.isSystem)),
    })),
  }
})
