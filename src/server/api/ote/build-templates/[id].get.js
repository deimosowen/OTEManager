import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteBuildTemplates } from '../../../db/schema.js'
import { rowIsPersonal } from '../../../utils/build-template-access.js'
import { fetchGroupIdsForBuildTemplate } from '../../../utils/build-template-groups.js'
import { mapBuildTemplateFull } from '../../../utils/build-template-map.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

function parseTemplateId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const me = integrationUserKey(user)
  const id = parseTemplateId(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, message: 'Некорректный id' })

  const db = getDb()
  const rows = await db.select().from(oteBuildTemplates).where(eq(oteBuildTemplates.id, id)).limit(1)
  const row = rows[0]
  if (!row) throw createError({ statusCode: 404, message: 'Шаблон не найден' })

  /** Личный — только автор; общий — любой вошедший пользователь (просмотр/редактирование по автору в PUT). */
  if (rowIsPersonal(row.isPersonal) && String(row.createdByLogin || '') !== me) {
    throw createError({
      statusCode: 403,
      message: 'Этот шаблон личный и доступен только автору',
    })
  }

  const template = mapBuildTemplateFull(row)
  if (rowIsPersonal(row.isPersonal)) {
    return { template: { ...template, groupIds: [] } }
  }
  const groupIds = await fetchGroupIdsForBuildTemplate(db, id)
  return { template: { ...template, groupIds } }
})
