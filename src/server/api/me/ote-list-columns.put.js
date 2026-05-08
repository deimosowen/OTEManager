import { OTE_LIST_VIEW_ENV_YC } from '@app-constants/ote-list-columns.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'
import { upsertOteListColumnPrefsForUser } from '../../utils/ote-list-column-prefs.js'

/** Сохранить порядок и видимость колонок: `{ view: "env_yc", items: [{ id, visible }] }`. */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const body = await readBody(event)
  const viewKey =
    body && typeof body.view === 'string' && body.view.trim() ? String(body.view).trim() : OTE_LIST_VIEW_ENV_YC
  const rawItems = body && Array.isArray(body.items) ? body.items : []
  const groupedLayout =
    body && Object.prototype.hasOwnProperty.call(body, 'groupedValueLayout')
      ? body.groupedValueLayout
      : undefined

  const out = await upsertOteListColumnPrefsForUser(user, viewKey, rawItems, groupedLayout)
  return { ok: true, view: viewKey, ...out }
})
