import { requireOteUser } from '../../../../utils/require-ote-auth.js'
import { parseAuditListQuery, queryAuditEvents } from '../../../../utils/audit-log.js'

/**
 * События аудита по одной OTE (идентификатор строки в UI: grp:…, id ВМ, seed-…).
 *
 * Пагинация: `page`. Фильтры: `actionCode`, `search` (логин / почта / метка — OR), `dateFrom`, `dateTo`.
 * Query `oteTag` — значение metadata.tag (как в карточке `oteName`): в выборку попадают строки с этим `ote_tag`
 * или с `ote_resource_id` равным id карточки (создание OTE, старт/стоп и т.д. с привязкой к тэгу).
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
    oteTag: parsed.lockedOteTag || null,
    items,
    total,
    page,
    pageSize,
    syncedAt: new Date().toISOString(),
  }
})
