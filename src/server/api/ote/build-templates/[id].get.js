import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteBuildTemplates } from '../../../db/schema.js'
import {
  buildTemplateVisibleToViewer,
  resolveBuildTemplateViewer,
  rowIsPersonal,
  viewerIsBuildTemplateAuthor,
} from '../../../utils/build-template-access.js'
import { fetchGroupIdsForBuildTemplate } from '../../../utils/build-template-groups.js'
import { mapBuildTemplateFull } from '../../../utils/build-template-map.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

function parseTemplateId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = parseTemplateId(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, message: 'Некорректный id' })

  const db = getDb()
  const config = useRuntimeConfig(event)
  const viewer = await resolveBuildTemplateViewer(db, config, user)
  if (!viewer) throw createError({ statusCode: 401, message: 'Требуется вход' })

  const rows = await db.select().from(oteBuildTemplates).where(eq(oteBuildTemplates.id, id)).limit(1)
  const row = rows[0]
  if (!row) throw createError({ statusCode: 404, message: 'Шаблон не найден' })

  /** Личный — только автор; общий — любой вошедший пользователь. */
  const visible = await buildTemplateVisibleToViewer(db, row, id, viewer)
  if (!visible) {
    throw createError({
      statusCode: 403,
      message: 'Нет доступа к этому шаблону',
    })
  }

  const template = mapBuildTemplateFull(row)
  const canManagePersonalFlag = viewerIsBuildTemplateAuthor(viewer, row)
  if (rowIsPersonal(row.isPersonal)) {
    return { template: { ...template, groupIds: [], canManagePersonalFlag } }
  }
  const groupIds = await fetchGroupIdsForBuildTemplate(db, id)
  return { template: { ...template, groupIds, canManagePersonalFlag } }
})
