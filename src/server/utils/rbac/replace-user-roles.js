import { and, eq, inArray } from 'drizzle-orm'
import { createError } from 'h3'
import { ROLE_CODES } from '@app-constants/rbac.js'
import { appRoles, oteDirectoryUsers, oteUserRoleAssignments } from '../../db/schema.js'

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string[]} codes
 */
async function getRoleIdsByCodes(db, codes) {
  const uniq = [...new Set(codes)]
  if (!uniq.length) return new Map()
  const rows = await db.select({ id: appRoles.id, code: appRoles.code }).from(appRoles).where(inArray(appRoles.code, uniq))
  return new Map(rows.map((r) => [r.code, r.id]))
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {number} adminRoleId
 */
async function countAdminUsers(db, adminRoleId) {
  const rows = await db
    .select({ userKey: oteUserRoleAssignments.userKey })
    .from(oteUserRoleAssignments)
    .where(eq(oteUserRoleAssignments.roleId, adminRoleId))
  return new Set(rows.map((r) => r.userKey)).size
}

/**
 * Полная замена ролей пользователя (проверки: известные коды, нельзя снять последнего админа).
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} actorUserKey
 * @param {string} targetUserKey
 * @param {string[]} requestedCodes
 */
export async function replaceUserRolesChecked(db, actorUserKey, targetUserKey, requestedCodes) {
  const dir = await db.select({ k: oteDirectoryUsers.userKey }).from(oteDirectoryUsers).where(eq(oteDirectoryUsers.userKey, targetUserKey)).limit(1)
  if (!dir.length) {
    throw createError({ statusCode: 404, message: 'Пользователь не найден в каталоге (ещё не входил в приложение).' })
  }

  const codes = [...new Set((requestedCodes || []).map((c) => String(c || '').trim()).filter(Boolean))]
  if (!codes.includes(ROLE_CODES.USER)) {
    throw createError({
      statusCode: 400,
      message: 'Роль «Пользователь» (user) обязательна и не может быть снята.',
    })
  }

  const known = await db.select({ code: appRoles.code }).from(appRoles)
  const knownSet = new Set(known.map((k) => k.code))
  for (const c of codes) {
    if (!knownSet.has(c)) {
      throw createError({ statusCode: 400, message: `Неизвестный код роли: ${c}` })
    }
  }

  const idByCode = await getRoleIdsByCodes(db, codes)
  const adminRoleId = idByCode.get(ROLE_CODES.ADMIN)
  let hadAdmin = false
  if (adminRoleId) {
    const had = await db
      .select({ one: oteUserRoleAssignments.roleId })
      .from(oteUserRoleAssignments)
      .where(and(eq(oteUserRoleAssignments.userKey, targetUserKey), eq(oteUserRoleAssignments.roleId, adminRoleId)))
      .limit(1)
    hadAdmin = had.length > 0
  }
  const willHaveAdmin = codes.includes(ROLE_CODES.ADMIN)

  if (hadAdmin && !willHaveAdmin && adminRoleId) {
    const n = await countAdminUsers(db, adminRoleId)
    if (n <= 1) {
      throw createError({
        statusCode: 400,
        message: 'Нельзя снять роль администратора с последнего администратора в системе.',
      })
    }
  }

  await db.delete(oteUserRoleAssignments).where(eq(oteUserRoleAssignments.userKey, targetUserKey))
  const now = new Date()
  for (const c of codes) {
    const rid = idByCode.get(c)
    if (rid) {
      await db.insert(oteUserRoleAssignments).values({
        userKey: targetUserKey,
        roleId: rid,
        assignedAt: now,
        assignedByUserKey: actorUserKey,
      })
    }
  }
}
