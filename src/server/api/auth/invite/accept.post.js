import { createError } from 'h3'
import { getDb } from '../../../db/client.js'
import { tryConsumeGroupInviteCookie } from '../../../utils/group-invite.js'
import { ensureOteUserRbacState } from '../../../utils/rbac/bootstrap.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

/** Подтверждение приглашения: смена группы по cookie. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const db = getDb()
  const baseUser = requireOteUser(event)
  await ensureOteUserRbacState(db, config, baseUser)

  const ir = await tryConsumeGroupInviteCookie(event, db, config, baseUser)
  if (!ir.handled) {
    throw createError({ statusCode: 400, message: 'Нет ожидающего приглашения. Откройте ссылку приглашения снова.' })
  }
  const r = ir.result
  if (r?.kind === 'bad_invite') {
    throw createError({ statusCode: 400, message: r.message || 'Не удалось применить приглашение' })
  }
  return { ok: true, kind: r?.kind }
})
