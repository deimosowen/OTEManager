import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteUserBuildTemplateFavorites } from '../../../db/schema.js'
import { buildTemplateIdVisibleToUser } from '../../../utils/build-template-access.js'
import { getBuildTemplateShortcutsPayload } from '../../../utils/build-template-shortcuts.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const me = integrationUserKey(user)
  const body = await readBody(event)
  const raw = body && typeof body === 'object' ? body.buildTemplateId : undefined
  const id = typeof raw === 'number' && Number.isInteger(raw) ? raw : Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Укажите buildTemplateId' })
  }

  const db = getDb()
  const visible = await buildTemplateIdVisibleToUser(db, id, me)
  if (!visible) {
    throw createError({ statusCode: 404, message: 'Шаблон не найден или недоступен' })
  }

  const existing = await db
    .select({ one: oteUserBuildTemplateFavorites.buildTemplateId })
    .from(oteUserBuildTemplateFavorites)
    .where(
      and(
        eq(oteUserBuildTemplateFavorites.userLogin, me),
        eq(oteUserBuildTemplateFavorites.buildTemplateId, id),
      ),
    )
    .limit(1)

  if (existing.length) {
    await db
      .delete(oteUserBuildTemplateFavorites)
      .where(
        and(
          eq(oteUserBuildTemplateFavorites.userLogin, me),
          eq(oteUserBuildTemplateFavorites.buildTemplateId, id),
        ),
      )
  } else {
    await db.insert(oteUserBuildTemplateFavorites).values({
      userLogin: me,
      buildTemplateId: id,
      addedAt: new Date(),
    })
  }

  return getBuildTemplateShortcutsPayload(db, me)
})
