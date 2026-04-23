import { requireOteUser } from '../../../../utils/require-ote-auth.js'
import { parseAuditListQuery, queryAuditEvents } from '../../../../utils/audit-log.js'

/**
 * События аудита по одной OTE (идентификатор строки в UI: grp:…, id ВМ, seed-…).
 *
 * Пагинация: `page`. Фильтры: `actionCode`, `search` (логин / почта / метка — OR), `dateFrom`, `dateTo`.
 */
export default defineEventHandler(async (event) => {
  requireOteUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Не указан id' })
  }
  const q = getQuery(event)
  const parsed = parseAuditListQuery(q, { lockedOteResourceId: id })
  const { items, total, page, pageSize } = await queryAuditEvents(parsed)
  return {
    oteResourceId: id,
    items,
    total,
    page,
    pageSize,
    syncedAt: new Date().toISOString(),
  }
})
