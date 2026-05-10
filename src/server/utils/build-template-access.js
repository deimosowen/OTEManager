import { eq, sql } from 'drizzle-orm'
import { userHasAdminRole } from '@app-constants/rbac.js'
import { oteBuildTemplates } from '../db/schema.js'
import { fetchGroupIdsForBuildTemplate } from './build-template-groups.js'
import { attachRbacToPublicUser } from './rbac/bootstrap.js'
import { integrationUserKey } from './integrations/user-credentials.js'

/**
 * @typedef {{ userKey: string, groupId: number | null, isAdmin: boolean }} BuildTemplateViewer
 */

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase} db
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ login?: string, email?: string, id?: string, name?: string }} baseUserFromRequire
 * @returns {Promise<BuildTemplateViewer | null>}
 */
export async function resolveBuildTemplateViewer(db, config, baseUserFromRequire) {
  if (!baseUserFromRequire || typeof baseUserFromRequire !== 'object') return null
  const enriched = await attachRbacToPublicUser(db, config, baseUserFromRequire)
  if (!enriched?.id) return null
  const userKey = integrationUserKey(enriched)
  const gidRaw = enriched.group?.id
  const groupId = gidRaw != null && Number.isFinite(Number(gidRaw)) ? Math.trunc(Number(gidRaw)) : null
  return {
    userKey,
    groupId,
    isAdmin: userHasAdminRole(enriched.roles),
  }
}

/**
 * WHERE-фрагмент: шаблон виден наблюдателю по правилам личный / общий + группы.
 * У общего шаблона без связок в БД сохраняется прежнее поведение («доступен всем с учёткой»).
 *
 * @param {BuildTemplateViewer} viewer
 */
export function sqlBuildTemplatesReadable(viewer) {
  if (!viewer?.userKey) {
    return sql`1 = 0`
  }
  const userKeyStr = viewer.userKey

  const personal = sql`(${oteBuildTemplates.isPersonal} = 1 AND ${oteBuildTemplates.createdByLogin} = ${userKeyStr})`

  /** @type {import('drizzle-orm').SQL} */
  let shared
  if (viewer.groupId == null || !Number.isFinite(Number(viewer.groupId))) {
    shared = sql`(${oteBuildTemplates.isPersonal} = 0 AND NOT EXISTS (
      SELECT 1 FROM ote_build_template_groups btg
      WHERE btg.build_template_id = ${oteBuildTemplates.id}
    ))`
  } else {
    const gid = Math.trunc(Number(viewer.groupId))
    shared = sql`(${oteBuildTemplates.isPersonal} = 0 AND (
      NOT EXISTS (
        SELECT 1 FROM ote_build_template_groups btg
        WHERE btg.build_template_id = ${oteBuildTemplates.id}
      )
      OR EXISTS (
        SELECT 1 FROM ote_build_template_groups btg2
        WHERE btg2.build_template_id = ${oteBuildTemplates.id}
          AND btg2.group_id = ${gid}
      )
    ))`
  }

  return sql`(${personal} OR ${shared})`
}

/** @deprecated Использовать sqlBuildTemplatesReadable после resolveBuildTemplateViewer */
export function whereBuildTemplateVisibleToUser(userKey) {
  return sqlBuildTemplatesReadable({
    userKey,
    groupId: null,
    isAdmin: true,
  })
}

/**
 * Доступ к шаблону: просмотр, сохранение и удаление (личный — только автор; общий — группы каталога или «всем», если связок нет).
 *
 * @param {import('drizzle-orm/libsql').LibSQLDatabase} db
 * @param {{ isPersonal?: unknown, createdByLogin?: unknown } | null | undefined} tplRow
 * @param {number} tplId
 * @param {BuildTemplateViewer} viewer
 */
export async function buildTemplateVisibleToViewer(db, tplRow, tplId, viewer) {
  if (!viewer) return false
  if (!tplRow || rowIsPersonal(tplRow.isPersonal)) {
    return tplRow ? String(tplRow.createdByLogin || '') === viewer.userKey : false
  }

  const gids = await fetchGroupIdsForBuildTemplate(db, tplId)
  if (!gids.length) return true
  return viewer.groupId != null && gids.includes(Number(viewer.groupId))
}

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase} db
 * @param {number} templateId
 * @param {BuildTemplateViewer} viewer
 */
export async function buildTemplateIdVisibleToViewer(db, templateId, viewer) {
  const tid = Math.trunc(Number(templateId))
  if (!viewer || !Number.isInteger(tid) || tid < 1) return false
  const rows = await db.select().from(oteBuildTemplates).where(eq(oteBuildTemplates.id, tid)).limit(1)
  const tpl = rows[0]
  if (!tpl) return false
  return buildTemplateVisibleToViewer(db, tpl, tid, viewer)
}

/**
 * @deprecated use buildTemplateIdVisibleToViewer(viewer из resolveBuildTemplateViewer)
 * ВНИМАНИЕ: раньше не учитывались группы; оставлено для совместимости вызовов как «режим без ограничений» (isAdmin:true).
 *
 * @param {import('drizzle-orm/libsql').LibSQLDatabase} db
 * @param {number} templateId
 * @param {string} userKey
 */
export async function buildTemplateIdVisibleToUser(db, templateId, userKey) {
  /** @type {BuildTemplateViewer} */
  const viewer = { userKey, groupId: null, isAdmin: true }
  return buildTemplateIdVisibleToViewer(db, templateId, viewer)
}

/**
 * @param {unknown} body
 */
export function parseIsPersonalFromBody(body) {
  if (!body || typeof body !== 'object') return false
  const v = /** @type {Record<string, unknown>} */ (body).isPersonal
  if (v === true || v === 1) return true
  if (v === 'true' || v === '1' || v === 'yes') return true
  return false
}

/**
 * @param {unknown} v
 */
export function rowIsPersonal(v) {
  return v === 1 || v === true
}
