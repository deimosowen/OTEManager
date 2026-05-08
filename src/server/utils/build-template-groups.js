import { createError } from 'h3'
import { eq, inArray } from 'drizzle-orm'
import { oteAppGroups, oteBuildTemplateGroups } from '../db/schema.js'

/**
 * @param {unknown} body
 * @returns {number[]}
 */
export function parseBuildTemplateGroupIdsFromBody(body) {
  const raw =
    body && typeof body === 'object' /** @type {Record<string, unknown>} */ ? body.groupIds : undefined
  if (!Array.isArray(raw)) return []
  const nums = []
  for (const x of raw) {
    const n = typeof x === 'number' && Number.isInteger(x) ? x : Number(String(x ?? '').trim())
    if (!Number.isInteger(n) || n < 1) continue
    nums.push(Math.trunc(n))
  }
  return [...new Set(nums)]
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {number[]} ids
 */
export async function assertAllGroupIdsExist(db, ids) {
  const uniq = [...new Set(ids.map((x) => Math.trunc(Number(x))).filter((n) => Number.isInteger(n) && n > 0))]
  if (!uniq.length) {
    throw createError({
      statusCode: 400,
      message: 'Для общего шаблона укажите минимум одну группу каталога (поле «Доступно группам»).',
    })
  }
  const rows = await db.select({ id: oteAppGroups.id }).from(oteAppGroups).where(inArray(oteAppGroups.id, uniq))
  const have = new Set(rows.map((r) => Number(r.id)))
  for (const id of uniq) {
    if (!have.has(id)) {
      throw createError({ statusCode: 400, message: `Несуществующая группа каталога: ${id}` })
    }
  }
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {number} templateId
 * @returns {Promise<number[]>}
 */
export async function fetchGroupIdsForBuildTemplate(db, templateId) {
  const tid = Math.trunc(Number(templateId))
  if (!Number.isInteger(tid) || tid < 1) return []
  const rows = await db
    .select({ gid: oteBuildTemplateGroups.groupId })
    .from(oteBuildTemplateGroups)
    .where(eq(oteBuildTemplateGroups.buildTemplateId, tid))
  return rows.map((r) => Number(r.gid)).filter((n) => Number.isFinite(n))
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {number[]} templateIds
 * @returns {Promise<Map<number, number[]>>}
 */
export async function fetchGroupIdsByTemplateIds(db, templateIds) {
  const uniq = [...new Set(templateIds.map((x) => Math.trunc(Number(x))).filter((x) => Number.isInteger(x) && x > 0))]
  const map = new Map()
  for (const tid of uniq) map.set(tid, [])
  if (!uniq.length) return map

  const rows = await db
    .select({
      btid: oteBuildTemplateGroups.buildTemplateId,
      gid: oteBuildTemplateGroups.groupId,
    })
    .from(oteBuildTemplateGroups)
    .where(inArray(oteBuildTemplateGroups.buildTemplateId, uniq))

  for (const r of rows) {
    const tid = Number(r.btid)
    const gid = Number(r.gid)
    if (!Number.isFinite(tid) || !Number.isFinite(gid)) continue
    const list = map.get(tid)
    if (list) list.push(gid)
  }
  return map
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {number} templateId
 * @param {boolean} isPersonal
 * @param {number[]} groupIds
 */
export async function syncBuildTemplateGroupLinks(db, templateId, isPersonal, groupIds) {
  const tid = Math.trunc(Number(templateId))
  if (!Number.isInteger(tid) || tid < 1) return
  await db.delete(oteBuildTemplateGroups).where(eq(oteBuildTemplateGroups.buildTemplateId, tid))
  if (!isPersonal && groupIds.length) {
    await db.insert(oteBuildTemplateGroups).values(
      groupIds.map((groupId) => ({
        buildTemplateId: tid,
        groupId: Math.trunc(Number(groupId)),
      })),
    )
  }
}
