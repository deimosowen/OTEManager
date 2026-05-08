import { createError } from 'h3'
import { eq } from 'drizzle-orm'
import { insertGroupInvite } from '../../utils/group-invite.js'
import { requireOteAdmin } from '../../utils/require-ote-admin.js'
import { oteAppGroups } from '../../db/schema.js'

/** Администратор создаёт ссылку-приглашение в группу каталога. Токен в ответе — один раз в открытом виде. */
export default defineEventHandler(async (event) => {
  const { db, userKey } = await requireOteAdmin(event)
  const config = useRuntimeConfig(event)

  const body = await readBody(event)
  const groupId = Number(body?.groupId)
  if (!Number.isFinite(groupId)) {
    throw createError({ statusCode: 400, message: 'Укажите groupId' })
  }

  const gRows = await db
    .select({ id: oteAppGroups.id, name: oteAppGroups.name, isSystem: oteAppGroups.isSystem })
    .from(oteAppGroups)
    .where(eq(oteAppGroups.id, groupId))
    .limit(1)
  const g = gRows[0]
  if (!g) {
    throw createError({ statusCode: 404, message: 'Группа не найдена' })
  }
  if (Number(g.isSystem)) {
    throw createError({
      statusCode: 400,
      message: 'Приглашения для системной группы не создаются: новые пользователи и так в неё попадают автоматически.',
    })
  }

  const expiresInDays = body?.expiresInDays
  const maxUses = body?.maxUses

  const { plainToken, expiresAt, maxUses: mu } = await insertGroupInvite(db, {
    groupId,
    expiresInDays: Number(expiresInDays),
    maxUses: Number(maxUses),
    createdByUserKey: userKey,
  })

  const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '') || ''

  const inviteUrl = `${siteUrl}/invite?token=${plainToken}`
  const groupName = String(g.name || '')

  return {
    inviteUrl,
    expiresAt,
    maxUses: mu,
    groupId: Number(groupId),
    groupName,
  }
})
