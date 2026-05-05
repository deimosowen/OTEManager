import { eq } from 'drizzle-orm'
import { oteDirectoryUsers, oteGroupTeamcitySettings } from '../../db/schema.js'

/**
 * @param {unknown} s
 */
export function normalizeTcBaseUrl(s) {
  return String(s ?? '')
    .trim()
    .replace(/\/+$/, '')
}

/**
 * Настройки TeamCity для группы пользователя каталога (REST/UI + buildTypeId).
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} userKey
 */
export async function fetchTeamCityGroupSettingsByUserKey(db, userKey) {
  if (!userKey) return null
  const rows = await db
    .select({
      groupId: oteDirectoryUsers.groupId,
      tcRestBaseUrl: oteGroupTeamcitySettings.tcRestBaseUrl,
      tcUiBaseUrl: oteGroupTeamcitySettings.tcUiBaseUrl,
      startBuildTypeId: oteGroupTeamcitySettings.startBuildTypeId,
      stopBuildTypeId: oteGroupTeamcitySettings.stopBuildTypeId,
      deleteBuildTypeId: oteGroupTeamcitySettings.deleteBuildTypeId,
      modifyDeleteDateBuildTypeId: oteGroupTeamcitySettings.modifyDeleteDateBuildTypeId,
    })
    .from(oteDirectoryUsers)
    .innerJoin(oteGroupTeamcitySettings, eq(oteDirectoryUsers.groupId, oteGroupTeamcitySettings.groupId))
    .where(eq(oteDirectoryUsers.userKey, userKey))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    groupId: Number(r.groupId),
    tcRestBaseUrl: normalizeTcBaseUrl(r.tcRestBaseUrl),
    tcUiBaseUrl: normalizeTcBaseUrl(r.tcUiBaseUrl),
    startBuildTypeId: String(r.startBuildTypeId || '').trim(),
    stopBuildTypeId: String(r.stopBuildTypeId || '').trim(),
    deleteBuildTypeId: String(r.deleteBuildTypeId || '').trim(),
    modifyDeleteDateBuildTypeId: String(r.modifyDeleteDateBuildTypeId || '').trim(),
  }
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {number} groupId
 */
export async function fetchTeamCityGroupSettingsByGroupId(db, groupId) {
  const gid = Number(groupId)
  if (!Number.isFinite(gid)) return null
  const rows = await db.select().from(oteGroupTeamcitySettings).where(eq(oteGroupTeamcitySettings.groupId, gid)).limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    groupId: gid,
    tcRestBaseUrl: normalizeTcBaseUrl(r.tcRestBaseUrl),
    tcUiBaseUrl: normalizeTcBaseUrl(r.tcUiBaseUrl),
    startBuildTypeId: String(r.startBuildTypeId || '').trim(),
    stopBuildTypeId: String(r.stopBuildTypeId || '').trim(),
    deleteBuildTypeId: String(r.deleteBuildTypeId || '').trim(),
    modifyDeleteDateBuildTypeId: String(r.modifyDeleteDateBuildTypeId || '').trim(),
    updatedAt: r.updatedAt,
    updatedByUserKey: r.updatedByUserKey ? String(r.updatedByUserKey) : null,
  }
}
