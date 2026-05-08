import { createHash, randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { deleteCookie, getCookie } from 'h3'
import { AUDIT_ACTION } from '@app-constants/audit.js'
import { oteGroupInvites } from '../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from './audit-log.js'
import { integrationUserKey } from './integrations/user-credentials.js'
import { fetchCatalogGroupForUserKey, setUserGroupChecked } from './ote-app-groups.js'
import { OTE_GROUP_INVITE_COOKIE } from './ote-session.js'
import { ensureOteUserRbacState } from './rbac/bootstrap.js'

const TOKEN_BYTES = 32
/** Длина токена в hex в URL и cookie */
export const GROUP_INVITE_TOKEN_HEX_LEN = TOKEN_BYTES * 2

/** @param {string} plain */
export function hashGroupInviteToken(plain) {
  return createHash('sha256').update(String(plain).trim().toLowerCase(), 'utf8').digest('hex')
}

export function generateGroupInvitePlainToken() {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

function tsMs(value) {
  if (value instanceof Date) return value.getTime()
  return Number(value)
}

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase} db
 * @param {string} tokenHex 64 символа a-f 0-9
 */
export async function findActiveGroupInvite(db, tokenHex) {
  const h = String(tokenHex || '').trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(h)) return null
  const tokenHash = hashGroupInviteToken(h)
  const rows = await db
    .select()
    .from(oteGroupInvites)
    .where(eq(oteGroupInvites.tokenHash, tokenHash))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  const now = Date.now()
  if (Number(row.revoked)) return null
  if (now > tsMs(row.expiresAt)) return null
  if (Number(row.useCount) >= Number(row.maxUses)) return null
  return row
}

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase} db
 * @param {{
 *   groupId: number,
 *   expiresInDays: number,
 *   maxUses: number,
 *   createdByUserKey: string | null,
 * }} opts
 */
export async function insertGroupInvite(db, opts) {
  const gid = Number(opts.groupId)
  const expiresInDays = Math.min(365, Math.max(1, Math.trunc(Number(opts.expiresInDays) || 7)))
  const maxUses = Math.min(5000, Math.max(1, Math.trunc(Number(opts.maxUses) || 1)))
  const now = Date.now()
  const plain = generateGroupInvitePlainToken()
  const tokenHash = hashGroupInviteToken(plain)
  const expiresAt = now + expiresInDays * 24 * 60 * 60 * 1000
  await db.insert(oteGroupInvites).values({
    tokenHash,
    groupId: gid,
    createdAt: new Date(now),
    expiresAt: new Date(expiresAt),
    maxUses,
    useCount: 0,
    createdByUserKey: opts.createdByUserKey || null,
    revoked: 0,
  })
  return { plainToken: plain, expiresAt: new Date(expiresAt).toISOString(), maxUses }
}

/** @param {import('h3').H3Event} event */
export function clearGroupInviteCookie(event) {
  deleteCookie(event, OTE_GROUP_INVITE_COOKIE, { path: '/' })
}

/**
 * @typedef {{ kind: 'applied' | 'noop_same_group' | 'bad_invite'; message?: string }} InviteFinalizeResult
 */

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase} db
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {Record<string, unknown>} inviteRow строка `ote_group_invites`
 * @param {{ id?: string, login?: string, email?: string, name?: string }} sessionUser
 * @returns {Promise<InviteFinalizeResult>}
 */
export async function finalizeGroupInviteMembership(db, config, inviteRow, sessionUser) {
  if (!sessionUser || (!sessionUser.id && !sessionUser.login && !sessionUser.email)) {
    return { kind: 'bad_invite', message: 'Не удалось определить пользователя после входа' }
  }

  await ensureOteUserRbacState(db, config, {
    id: sessionUser?.id ? String(sessionUser.id) : '',
    login: sessionUser?.login || '',
    email: sessionUser?.email || '',
    name: sessionUser?.name || '',
  })

  const userKey = integrationUserKey(sessionUser)
  if (!userKey) {
    return { kind: 'bad_invite', message: 'Не удалось сопоставить учётную запись' }
  }

  const prevGroup = await fetchCatalogGroupForUserKey(db, userKey)
  const targetGid = Number(inviteRow.groupId)

  if (prevGroup && Number(prevGroup.id) === targetGid) {
    return { kind: 'noop_same_group' }
  }

  await setUserGroupChecked(db, userKey, targetGid)

  const newCount = Number(inviteRow.useCount) + 1
  const revoked = newCount >= Number(inviteRow.maxUses) ? 1 : 0

  await db
    .update(oteGroupInvites)
    .set({ useCount: newCount, revoked })
    .where(eq(oteGroupInvites.id, inviteRow.id))

  const nextGroup = await fetchCatalogGroupForUserKey(db, userKey)
  await recordAuditEvent(
    auditPayloadFromUser(
      {
        login: sessionUser.login || '',
        email: sessionUser.email || '',
      },
      {
        actionCode: AUDIT_ACTION.USER_GROUP_UPDATE,
        oteResourceId: userKey,
        oteTag: null,
        details: {
          source: 'group_invite',
          inviteId: Number(inviteRow.id),
          prevGroup,
          nextGroup,
        },
      }),
  )

  return { kind: 'applied' }
}

/**
 * После OAuth: потребить пригласительную cookie.
 * @param {import('h3').H3Event} event
 * @param {import('drizzle-orm/libsql').LibSQLDatabase} db
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ id?: string, login?: string, email?: string, name?: string } | null} sessionUser из сессии Яндекс
 */
export async function tryConsumeGroupInviteCookie(event, db, config, sessionUser) {
  const raw = getCookie(event, OTE_GROUP_INVITE_COOKIE)
  const tokenHex = String(raw || '').trim().toLowerCase()
  if (!raw || !tokenHex) {
    return { handled: false }
  }

  if (!/^[a-f0-9]{64}$/.test(tokenHex)) {
    clearGroupInviteCookie(event)
    return { handled: true, result: { kind: 'bad_invite', message: 'Пригласительная ссылка повреждена' } }
  }

  const inviteRow = await findActiveGroupInvite(db, tokenHex)
  if (!inviteRow) {
    clearGroupInviteCookie(event)
    return { handled: true, result: { kind: 'bad_invite', message: 'Приглашение недействительно или срок действия истёк' } }
  }

  const res = await finalizeGroupInviteMembership(db, config, inviteRow, sessionUser)
  clearGroupInviteCookie(event)

  return { handled: true, result: res }
}
