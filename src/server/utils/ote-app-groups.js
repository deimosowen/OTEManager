import { randomBytes } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { GROUP_CODES } from '@app-constants/groups.js'
import { normalizeTcBaseUrl } from './teamcity/group-settings.js'
import { oteAppGroups, oteDirectoryUsers, oteGroupTeamcitySettings, oteGroupYcSettings } from '../db/schema.js'

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @returns {Promise<number | null>}
 */
export async function getDefaultGroupId(db) {
  const rows = await db
    .select({ id: oteAppGroups.id })
    .from(oteAppGroups)
    .where(eq(oteAppGroups.code, GROUP_CODES.DEFAULT))
    .limit(1)
  const id = rows[0]?.id
  return id != null ? Number(id) : null
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 */
export async function listAppGroupsOrdered(db) {
  return db
    .select({
      id: oteAppGroups.id,
      code: oteAppGroups.code,
      name: oteAppGroups.name,
      isSystem: oteAppGroups.isSystem,
      createdAt: oteAppGroups.createdAt,
      updatedAt: oteAppGroups.updatedAt,
    })
    .from(oteAppGroups)
    .orderBy(desc(oteAppGroups.isSystem), oteAppGroups.name)
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} userKey
 * @returns {Promise<{ id: number, code: string, name: string, isSystem: boolean, tcRestBaseUrl: string, tcUiBaseUrl: string } | null>}
 */
export async function fetchGroupForUserKey(db, userKey) {
  if (!userKey) return null
  const rows = await db
    .select({
      id: oteAppGroups.id,
      code: oteAppGroups.code,
      name: oteAppGroups.name,
      isSystem: oteAppGroups.isSystem,
      tcRestBaseUrl: oteGroupTeamcitySettings.tcRestBaseUrl,
      tcUiBaseUrl: oteGroupTeamcitySettings.tcUiBaseUrl,
    })
    .from(oteDirectoryUsers)
    .innerJoin(oteAppGroups, eq(oteDirectoryUsers.groupId, oteAppGroups.id))
    .innerJoin(oteGroupTeamcitySettings, eq(oteAppGroups.id, oteGroupTeamcitySettings.groupId))
    .where(eq(oteDirectoryUsers.userKey, userKey))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    id: Number(r.id),
    code: String(r.code || ''),
    name: String(r.name || ''),
    isSystem: Boolean(Number(r.isSystem)),
    tcRestBaseUrl: normalizeTcBaseUrl(r.tcRestBaseUrl),
    tcUiBaseUrl: normalizeTcBaseUrl(r.tcUiBaseUrl),
  }
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {number} id
 */
async function getGroupRowById(db, id) {
  const rows = await db.select().from(oteAppGroups).where(eq(oteAppGroups.id, id)).limit(1)
  return rows[0] ?? null
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} name
 */
export async function createAppGroup(db, name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) {
    throw createError({ statusCode: 400, message: 'Укажите название группы' })
  }
  if (trimmed.length > 256) {
    throw createError({ statusCode: 400, message: 'Название группы слишком длинное' })
  }
  const code = `g_${randomBytes(10).toString('hex')}`
  const now = new Date()
  const ins = await db
    .insert(oteAppGroups)
    .values({
      code,
      name: trimmed,
      isSystem: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: oteAppGroups.id,
      code: oteAppGroups.code,
      name: oteAppGroups.name,
      isSystem: oteAppGroups.isSystem,
    })
  const row = ins[0]
  if (!row) throw createError({ statusCode: 500, message: 'Не удалось создать группу' })
  const newId = Number(row.id)
  const defId = await getDefaultGroupId(db)
  if (defId) {
    const srcRows = await db
      .select()
      .from(oteGroupTeamcitySettings)
      .where(eq(oteGroupTeamcitySettings.groupId, defId))
      .limit(1)
    const src = srcRows[0]
    if (src) {
      await db.insert(oteGroupTeamcitySettings).values({
        groupId: newId,
        tcRestBaseUrl: String(src.tcRestBaseUrl),
        tcUiBaseUrl: String(src.tcUiBaseUrl),
        startBuildTypeId: String(src.startBuildTypeId),
        stopBuildTypeId: String(src.stopBuildTypeId),
        deleteBuildTypeId: String(src.deleteBuildTypeId),
        modifyDeleteDateBuildTypeId: String(
          src.modifyDeleteDateBuildTypeId || 'CasePro_UniversalDeploy_ModifyDateDelete',
        ),
        updatedAt: now,
        updatedByUserKey: null,
      })
    } else {
      await db.insert(oteGroupTeamcitySettings).values({
        groupId: newId,
        tcRestBaseUrl: 'https://ci.pravo.tech',
        tcUiBaseUrl: 'https://ci.pravo.tech',
        startBuildTypeId: 'CasePro_UniversalDeploy_StartByTag',
        stopBuildTypeId: 'CasePro_UniversalDeploy_StopByTag',
        deleteBuildTypeId: 'CasePro_UniversalDeploy_Delete',
        modifyDeleteDateBuildTypeId: 'CasePro_UniversalDeploy_ModifyDateDelete',
        updatedAt: now,
        updatedByUserKey: null,
      })
    }
    const ycSrcRows = await db.select().from(oteGroupYcSettings).where(eq(oteGroupYcSettings.groupId, defId)).limit(1)
    const ycSrc = ycSrcRows[0]
    if (ycSrc) {
      await db.insert(oteGroupYcSettings).values({
        groupId: newId,
        ycFolderId: String(ycSrc.ycFolderId || ''),
        updatedAt: now,
        updatedByUserKey: null,
      })
    } else {
      await db.insert(oteGroupYcSettings).values({
        groupId: newId,
        ycFolderId: '',
        updatedAt: now,
        updatedByUserKey: null,
      })
    }
  }
  return {
    id: newId,
    code: String(row.code),
    name: String(row.name),
    isSystem: Boolean(Number(row.isSystem)),
  }
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {number} id
 * @param {string} name
 */
export async function renameAppGroup(db, id, name) {
  const gid = Number(id)
  if (!Number.isFinite(gid)) {
    throw createError({ statusCode: 400, message: 'Некорректный id группы' })
  }
  const trimmed = String(name || '').trim()
  if (!trimmed) {
    throw createError({ statusCode: 400, message: 'Укажите название группы' })
  }
  const row = await getGroupRowById(db, gid)
  if (!row) {
    throw createError({ statusCode: 404, message: 'Группа не найдена' })
  }
  if (Number(row.isSystem)) {
    throw createError({ statusCode: 400, message: 'Системную группу нельзя переименовать' })
  }
  const now = new Date()
  await db.update(oteAppGroups).set({ name: trimmed, updatedAt: now }).where(eq(oteAppGroups.id, gid))
  return { id: gid, code: String(row.code), name: trimmed, isSystem: false }
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {number} id
 */
export async function deleteAppGroup(db, id) {
  const gid = Number(id)
  if (!Number.isFinite(gid)) {
    throw createError({ statusCode: 400, message: 'Некорректный id группы' })
  }
  const row = await getGroupRowById(db, gid)
  if (!row) {
    throw createError({ statusCode: 404, message: 'Группа не найдена' })
  }
  if (Number(row.isSystem)) {
    throw createError({ statusCode: 400, message: 'Системную группу нельзя удалить' })
  }
  const defId = await getDefaultGroupId(db)
  if (!defId) {
    throw createError({ statusCode: 500, message: 'Не найдена группа по умолчанию' })
  }
  const now = new Date()
  await db.update(oteDirectoryUsers).set({ groupId: defId }).where(eq(oteDirectoryUsers.groupId, gid))
  await db.delete(oteAppGroups).where(eq(oteAppGroups.id, gid))
  return { ok: true, reassignedToGroupId: defId }
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} targetUserKey
 * @param {number} groupId
 */
export async function setUserGroupChecked(db, targetUserKey, groupId) {
  const gid = Number(groupId)
  if (!Number.isFinite(gid)) {
    throw createError({ statusCode: 400, message: 'Некорректный groupId' })
  }
  const dir = await db
    .select({ k: oteDirectoryUsers.userKey })
    .from(oteDirectoryUsers)
    .where(eq(oteDirectoryUsers.userKey, targetUserKey))
    .limit(1)
  if (!dir.length) {
    throw createError({ statusCode: 404, message: 'Пользователь не найден в каталоге (ещё не входил в приложение).' })
  }
  const g = await getGroupRowById(db, gid)
  if (!g) {
    throw createError({ statusCode: 400, message: 'Группа не найдена' })
  }
  await db.update(oteDirectoryUsers).set({ groupId: gid }).where(eq(oteDirectoryUsers.userKey, targetUserKey))
  return fetchGroupForUserKey(db, targetUserKey)
}

/**
 * Подстраховка: у каталожной записи всегда есть группа (после миграции 0015_ote_app_groups).
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} userKey
 */
export async function ensureDirectoryUserGroupId(db, userKey) {
  const defId = await getDefaultGroupId(db)
  if (!defId) return
  const rows = await db
    .select({ groupId: oteDirectoryUsers.groupId })
    .from(oteDirectoryUsers)
    .where(eq(oteDirectoryUsers.userKey, userKey))
    .limit(1)
  const cur = rows[0]?.groupId
  if (cur == null) {
    await db.update(oteDirectoryUsers).set({ groupId: defId }).where(eq(oteDirectoryUsers.userKey, userKey))
  }
}
