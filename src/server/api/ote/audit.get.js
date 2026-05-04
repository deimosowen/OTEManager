import { parseAuditListQuery, queryAuditEvents } from '../../utils/audit-log.js'
import { requireOteAdmin } from '../../utils/require-ote-admin.js'

/**
 * Журнал аудита (все события). Только администраторы.
 *
 * Пагинация: `page` (с 1), размер страницы фиксирован в коде.
 * Фильтры: `actionCode`, `search` (логин / почта / метка / id OTE — OR), `dateFrom`, `dateTo` (YYYY-MM-DD, UTC).
 */
export default defineEventHandler(async (event) => {
  await requireOteAdmin(event)
  const q = getQuery(event)
  const parsed = parseAuditListQuery(q, {})
  const { items, total, page, pageSize } = await queryAuditEvents(parsed)
  return {
    items,
    total,
    page,
    pageSize,
    syncedAt: new Date().toISOString(),
  }
})
