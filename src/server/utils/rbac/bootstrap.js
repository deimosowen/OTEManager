import { eq } from 'drizzle-orm'
import { ROLE_CODES } from '@app-constants/rbac.js'
import { appRoles, oteDirectoryUsers, oteUserRoleAssignments } from '../../db/schema.js'
import { ensureDirectoryUserGroupId, fetchGroupForUserKey, getDefaultGroupId } from '../ote-app-groups.js'
import { integrationUserKey } from '../integrations/user-credentials.js'
import { runtimeConfigString } from '../yc/config-helpers.js'

function normEmail(s) {
  return String(s || '').trim().toLowerCase()
}

/**
 * Upsert в каталоге + гарантированная роль `user`; при совпадении с `NUXT_OTE_GLOBAL_ADMIN_EMAIL` — ещё и `admin`.
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ login?: string, email?: string, id?: string, name?: string }} user
 */
export async function ensureOteUserRbacState(db, config, user) {
  const userKey = integrationUserKey(user)
  if (!userKey) return
  const now = new Date()
  const email = String(user.email || '').trim()
  const login = String(user.login || '').trim()
  const displayName = String(user.name || '').trim() || login || email || userKey

  const existing = await db
    .select({ k: oteDirectoryUsers.userKey })
    .from(oteDirectoryUsers)
    .where(eq(oteDirectoryUsers.userKey, userKey))
    .limit(1)
  if (existing.length) {
    await db
      .update(oteDirectoryUsers)
      .set({ email, login, displayName, lastSeenAt: now })
      .where(eq(oteDirectoryUsers.userKey, userKey))
    await ensureDirectoryUserGroupId(db, userKey)
  } else {
    const defaultGroupId = await getDefaultGroupId(db)
    if (!defaultGroupId) {
      throw new Error('ote_app_groups: не найдена системная группа (code=default). Примените миграции.')
    }
    await db.insert(oteDirectoryUsers).values({
      userKey,
      email,
      login,
      displayName,
      groupId: defaultGroupId,
      firstSeenAt: now,
      lastSeenAt: now,
    })
  }

  const roleRows = await db.select({ id: appRoles.id, code: appRoles.code }).from(appRoles)
  const byCode = new Map(roleRows.map((r) => [r.code, r.id]))
  const userRid = byCode.get(ROLE_CODES.USER)
  if (userRid) {
    await db
      .insert(oteUserRoleAssignments)
      .values({ userKey, roleId: userRid, assignedAt: now, assignedByUserKey: null })
      .onConflictDoNothing()
  }

  const global = normEmail(runtimeConfigString(config.oteGlobalAdminEmail, 'NUXT_OTE_GLOBAL_ADMIN_EMAIL'))
  if (global && normEmail(email) === global) {
    const adminRid = byCode.get(ROLE_CODES.ADMIN)
    if (adminRid) {
      await db
        .insert(oteUserRoleAssignments)
        .values({ userKey, roleId: adminRid, assignedAt: now, assignedByUserKey: null })
        .onConflictDoNothing()
    }
  }
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} userKey
 * @returns {Promise<string[]>}
 */
export async function fetchRoleCodesForUserKey(db, userKey) {
  if (!userKey) return []
  const rows = await db
    .select({ code: appRoles.code })
    .from(oteUserRoleAssignments)
    .innerJoin(appRoles, eq(appRoles.id, oteUserRoleAssignments.roleId))
    .where(eq(oteUserRoleAssignments.userKey, userKey))
  return [...new Set(rows.map((r) => String(r.code || '').trim()).filter(Boolean))]
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {Record<string, unknown> | null} baseUser
 */
export async function attachRbacToPublicUser(db, config, baseUser) {
  if (!baseUser || typeof baseUser !== 'object') return null
  await ensureOteUserRbacState(db, config, /** @type {{login?: string, email?: string, id?: string, name?: string}} */ (baseUser))
  const key = integrationUserKey(/** @type {{login?: string, email?: string, id?: string}} */ (baseUser))
  const codes = await fetchRoleCodesForUserKey(db, key)
  const group = await fetchGroupForUserKey(db, key)
  return { ...baseUser, roles: codes, group }
}
