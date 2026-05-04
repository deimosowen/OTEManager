import { createError } from 'h3'
import { eq } from 'drizzle-orm'
import { oteDirectoryUsers, oteGroupYcSettings } from '../../db/schema.js'
import { integrationUserKey } from '../integrations/user-credentials.js'

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} userKey
 */
export async function fetchYcGroupSettingsByUserKey(db, userKey) {
  if (!userKey) return null
  const rows = await db
    .select({
      groupId: oteDirectoryUsers.groupId,
      ycFolderId: oteGroupYcSettings.ycFolderId,
    })
    .from(oteDirectoryUsers)
    .innerJoin(oteGroupYcSettings, eq(oteDirectoryUsers.groupId, oteGroupYcSettings.groupId))
    .where(eq(oteDirectoryUsers.userKey, userKey))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    groupId: Number(r.groupId),
    ycFolderId: String(r.ycFolderId || '').trim(),
  }
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {number} groupId
 */
export async function fetchYcGroupSettingsByGroupId(db, groupId) {
  const gid = Number(groupId)
  if (!Number.isFinite(gid)) return null
  const rows = await db.select().from(oteGroupYcSettings).where(eq(oteGroupYcSettings.groupId, gid)).limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    groupId: gid,
    ycFolderId: String(r.ycFolderId || '').trim(),
    updatedAt: r.updatedAt,
    updatedByUserKey: r.updatedByUserKey ? String(r.updatedByUserKey) : null,
  }
}

/**
 * Идентификатор каталога YC для пользователя (из настроек его группы), без исключения.
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {{ login?: string, email?: string } | null} user
 * @returns {Promise<string>} непустая строка или пусто, если не задано
 */
export async function getYcFolderIdForUser(db, user) {
  const key = integrationUserKey(user)
  const yc = await fetchYcGroupSettingsByUserKey(db, key)
  return String(yc?.ycFolderId || '').trim()
}

/**
 * Каталог YC для операций пользователя (из настроек его группы).
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {{ login?: string, email?: string } | null} user
 * @returns {Promise<string>}
 */
export async function requireYcFolderIdForUser(db, user) {
  const folderId = await getYcFolderIdForUser(db, user)
  if (!folderId) {
    throw createError({
      statusCode: 503,
      message: 'Для вашей группы не задан каталог Yandex Cloud в настройках системы.',
    })
  }
  return folderId
}
