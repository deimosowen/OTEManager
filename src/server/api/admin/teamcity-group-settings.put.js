import { createError } from 'h3'
import { eq } from 'drizzle-orm'
import { oteAppGroups, oteGroupTeamcitySettings, oteGroupYcSettings } from '../../db/schema.js'
import { integrationUserKey } from '../../utils/integrations/user-credentials.js'
import { normalizeTcBaseUrl } from '../../utils/teamcity/group-settings.js'
import { requireOteAdmin } from '../../utils/require-ote-admin.js'

/**
 * Сохранить настройки TeamCity и YC для одной или нескольких групп (только admin).
 * Тело: `{ items: [{ groupId, tc…, ycFolderId? }] }`.
 */
export default defineEventHandler(async (event) => {
  const { db, user } = await requireOteAdmin(event)
  const body = await readBody(event)
  const rawItems = body && Array.isArray(body.items) ? body.items : null
  if (!rawItems?.length) {
    throw createError({ statusCode: 400, message: 'Ожидается items: массив настроек по группам' })
  }

  const editorKey = integrationUserKey(user)
  const now = new Date()

  for (const it of rawItems) {
    const gid = Number(it?.groupId)
    if (!Number.isFinite(gid) || gid < 1) {
      throw createError({ statusCode: 400, message: 'Некорректный groupId в items' })
    }
    const gRows = await db.select({ id: oteAppGroups.id }).from(oteAppGroups).where(eq(oteAppGroups.id, gid)).limit(1)
    if (!gRows.length) {
      throw createError({ statusCode: 400, message: `Группа не найдена: ${gid}` })
    }

    const tcRestBaseUrl = normalizeTcBaseUrl(it?.tcRestBaseUrl)
    const tcUiBaseUrl = normalizeTcBaseUrl(it?.tcUiBaseUrl)
    const startBuildTypeId = String(it?.startBuildTypeId ?? '').trim().slice(0, 512)
    const stopBuildTypeId = String(it?.stopBuildTypeId ?? '').trim().slice(0, 512)
    const deleteBuildTypeId = String(it?.deleteBuildTypeId ?? '').trim().slice(0, 512)

    if (!tcRestBaseUrl || !tcUiBaseUrl) {
      throw createError({ statusCode: 400, message: `Группа ${gid}: укажите REST и UI URL TeamCity` })
    }
    if (!startBuildTypeId || !stopBuildTypeId || !deleteBuildTypeId) {
      throw createError({ statusCode: 400, message: `Группа ${gid}: укажите все три buildTypeId` })
    }

    await db
      .update(oteGroupTeamcitySettings)
      .set({
        tcRestBaseUrl,
        tcUiBaseUrl,
        startBuildTypeId,
        stopBuildTypeId,
        deleteBuildTypeId,
        updatedAt: now,
        updatedByUserKey: editorKey || null,
      })
      .where(eq(oteGroupTeamcitySettings.groupId, gid))

    const ycFolderId = String(it?.ycFolderId ?? '').trim().slice(0, 128)

    await db
      .update(oteGroupYcSettings)
      .set({
        ycFolderId,
        updatedAt: now,
        updatedByUserKey: editorKey || null,
      })
      .where(eq(oteGroupYcSettings.groupId, gid))
  }

  return { ok: true, updated: rawItems.length }
})
