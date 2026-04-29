import { and, desc, eq, inArray } from 'drizzle-orm'
import { oteBuildTemplates, oteUserBuildTemplateFavorites, oteUserBuildTemplateRecent } from '../db/schema.js'
import { whereBuildTemplateVisibleToUser } from './build-template-access.js'

const MAX_RECENT_ROWS = 15

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase<typeof import('../db/schema.js')>} db
 * @param {string} userKey
 */
export async function getBuildTemplateShortcutsPayload(db, userKey) {
  const vis = whereBuildTemplateVisibleToUser(userKey)

  const favRows = await db
    .select({
      id: oteUserBuildTemplateFavorites.buildTemplateId,
    })
    .from(oteUserBuildTemplateFavorites)
    .innerJoin(oteBuildTemplates, eq(oteBuildTemplates.id, oteUserBuildTemplateFavorites.buildTemplateId))
    .where(and(eq(oteUserBuildTemplateFavorites.userLogin, userKey), vis))
    .orderBy(oteUserBuildTemplateFavorites.addedAt)

  const favoriteIds = favRows.map((r) => String(r.id))

  const recentRows = await db
    .select({
      buildTemplateId: oteUserBuildTemplateRecent.buildTemplateId,
      lastUsedAt: oteUserBuildTemplateRecent.lastUsedAt,
    })
    .from(oteUserBuildTemplateRecent)
    .innerJoin(oteBuildTemplates, eq(oteBuildTemplates.id, oteUserBuildTemplateRecent.buildTemplateId))
    .where(and(eq(oteUserBuildTemplateRecent.userLogin, userKey), vis))
    .orderBy(desc(oteUserBuildTemplateRecent.lastUsedAt))
    .limit(MAX_RECENT_ROWS)

  const recent = recentRows.map((r) => ({
    buildTemplateId: r.buildTemplateId,
    lastUsedAt:
      r.lastUsedAt instanceof Date ? r.lastUsedAt.getTime() : Number(r.lastUsedAt) || 0,
  }))

  return { favoriteIds, recent }
}

/**
 * @param {import('drizzle-orm/libsql').LibSQLDatabase<typeof import('../db/schema.js')>} db
 * @param {string} userKey
 * @param {number} buildTemplateId
 */
export async function pruneRecentForUser(db, userKey) {
  const rows = await db
    .select({ id: oteUserBuildTemplateRecent.buildTemplateId })
    .from(oteUserBuildTemplateRecent)
    .where(eq(oteUserBuildTemplateRecent.userLogin, userKey))
    .orderBy(desc(oteUserBuildTemplateRecent.lastUsedAt))

  if (rows.length <= MAX_RECENT_ROWS) return

  const dropIds = rows.slice(MAX_RECENT_ROWS).map((r) => r.id)
  if (!dropIds.length) return

  await db
    .delete(oteUserBuildTemplateRecent)
    .where(
      and(
        eq(oteUserBuildTemplateRecent.userLogin, userKey),
        inArray(oteUserBuildTemplateRecent.buildTemplateId, dropIds),
      ),
    )
}

export { MAX_RECENT_ROWS }
