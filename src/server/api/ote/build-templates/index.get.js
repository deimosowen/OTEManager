import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { getQuery } from 'h3'
import { getDb } from '../../../db/client.js'
import { oteAppGroups, oteBuildTemplates } from '../../../db/schema.js'
import { resolveBuildTemplateViewer, sqlBuildTemplatesReadable } from '../../../utils/build-template-access.js'
import { fetchGroupIdsByTemplateIds } from '../../../utils/build-template-groups.js'
import { mapBuildTemplateSummary } from '../../../utils/build-template-map.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const q = getQuery(event)

  const rawPersonal = typeof q.personal === 'string' ? q.personal.trim().toLowerCase() : ''
  const personalFilter = rawPersonal === 'yes' || rawPersonal === 'no' ? rawPersonal : 'all'

  const browseRaw =
    typeof q.browse === 'string' ? q.browse.trim().toLowerCase() : typeof q.scope === 'string' ? q.scope.trim().toLowerCase() : ''
  const browseCatalog = browseRaw === '1' || browseRaw === 'true' || browseRaw === 'yes' || browseRaw === 'browse'

  const db = getDb()
  const config = useRuntimeConfig(event)
  const viewer = await resolveBuildTemplateViewer(db, config, user)
  if (!viewer) {
    throw createError({ statusCode: 401, message: 'Требуется вход' })
  }

  /** Каталог /templates: все общие + личные только у автора (чужие личные не видны никому) */
  const browseKeys = viewer.identityKeys?.length ? viewer.identityKeys : [viewer.userKey]
  const browseVisibility =
    browseKeys.length > 0
      ? or(
          eq(oteBuildTemplates.isPersonal, 0),
          and(eq(oteBuildTemplates.isPersonal, 1), inArray(oteBuildTemplates.createdByLogin, browseKeys)),
        )
      : sql`1 = 0`
  const visibility = browseCatalog ? browseVisibility : sqlBuildTemplatesReadable(viewer)
  const scope =
    personalFilter === 'yes'
      ? and(visibility, eq(oteBuildTemplates.isPersonal, 1))
      : personalFilter === 'no'
        ? and(visibility, eq(oteBuildTemplates.isPersonal, 0))
        : visibility

  const rows = await db.select().from(oteBuildTemplates).where(scope).orderBy(desc(oteBuildTemplates.updatedAt))

  const nonPersonalIds = rows.filter((r) => !(r.isPersonal === 1 || r.isPersonal === true)).map((r) => r.id)
  const byTpl = await fetchGroupIdsByTemplateIds(db, nonPersonalIds)

  const allGids = [...new Set([...byTpl.values()].flat())]
  /** @type {Map<number, string>} */
  const nameById = new Map()
  if (allGids.length) {
    const gRows = await db
      .select({ id: oteAppGroups.id, name: oteAppGroups.name })
      .from(oteAppGroups)
      .where(inArray(oteAppGroups.id, allGids))
    for (const gr of gRows) {
      nameById.set(Number(gr.id), String(gr.name || ''))
    }
  }

  const templates = rows.map((row) => {
    const summary = mapBuildTemplateSummary(row)
    const pers = summary.isPersonal
    const gids = pers ? [] : [...(byTpl.get(Number(row.id)) ?? [])].sort((a, b) => a - b)
    const names = gids.map((id) => nameById.get(Number(id))).filter(Boolean)
    return {
      ...summary,
      groupIds: gids,
      /** Полный список имён групп каталога (для поповера в таблице) */
      groupNames: [...names],
      groupsPreview: names.slice(0, 4).join(', ') + (names.length > 4 ? ` +${names.length - 4}` : ''),
    }
  })

  return { templates }
})
