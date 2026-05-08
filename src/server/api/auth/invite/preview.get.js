import { eq } from 'drizzle-orm'
import { getCookie } from 'h3'
import { getDb } from '../../../db/client.js'
import { oteAppGroups } from '../../../db/schema.js'
import { findActiveGroupInvite, clearGroupInviteCookie } from '../../../utils/group-invite.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { fetchCatalogGroupForUserKey } from '../../../utils/ote-app-groups.js'
import { OTE_GROUP_INVITE_COOKIE } from '../../../utils/ote-session.js'
import { ensureOteUserRbacState } from '../../../utils/rbac/bootstrap.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

function tsIso(v) {
  if (v instanceof Date) return v.toISOString()
  return new Date(v).toISOString()
}

/** Предпросмотр приглашения по cookie (без смены группы). */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const config = useRuntimeConfig(event)
  const db = getDb()
  const baseUser = requireOteUser(event)
  await ensureOteUserRbacState(db, config, baseUser)

  const tokenHex = String(getCookie(event, OTE_GROUP_INVITE_COOKIE) || '').trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(tokenHex)) {
    return {
      ok: false,
      code: 'no_invite',
      message: 'Приглашение не найдено. Откройте ссылку из письма или сообщения ещё раз.',
    }
  }

  const invite = await findActiveGroupInvite(db, tokenHex)
  if (!invite) {
    clearGroupInviteCookie(event)
    return {
      ok: false,
      code: 'invalid',
      message: 'Приглашение недействительно или срок действия истёк.',
    }
  }

  const gRows = await db
    .select({ id: oteAppGroups.id, name: oteAppGroups.name })
    .from(oteAppGroups)
    .where(eq(oteAppGroups.id, invite.groupId))
    .limit(1)
  const g = gRows[0]
  const userKey = integrationUserKey(baseUser)
  const cur = await fetchCatalogGroupForUserKey(db, userKey)
  const targetGid = Number(invite.groupId)
  const alreadyMember = cur != null && Number(cur.id) === targetGid

  return {
    ok: true,
    groupName: String(g?.name || 'Группа'),
    groupId: targetGid,
    alreadyMember,
    expiresAt: tsIso(invite.expiresAt),
    maxUses: Number(invite.maxUses),
    usesRemaining: Math.max(0, Number(invite.maxUses) - Number(invite.useCount)),
  }
})
