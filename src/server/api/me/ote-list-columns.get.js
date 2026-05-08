import { OTE_LIST_VIEW_ENV_YC } from '@app-constants/ote-list-columns.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'
import { getOteListColumnPrefsForUser } from '../../utils/ote-list-column-prefs.js'

/** Реестр колонок + сохранённые настройки пользователя для списка OTE (YC). */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const user = requireOteUser(event)
  const q = getQuery(event)
  const viewKey = typeof q.view === 'string' && q.view.trim() ? q.view.trim() : OTE_LIST_VIEW_ENV_YC

  if (viewKey !== OTE_LIST_VIEW_ENV_YC) {
    throw createError({ statusCode: 400, message: 'Неизвестный режим представления' })
  }

  const { registry, items, groupedValueLayout } = await getOteListColumnPrefsForUser(user, viewKey)
  return {
    view: viewKey,
    registry,
    /** Дополнительные колонки по discover при необходимости. */
    extraRegistry: [],
    items,
    groupedValueLayout,
  }
})
