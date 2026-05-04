import { listAppGroupsOrdered } from '../../utils/ote-app-groups.js'
import { fetchTeamCityGroupSettingsByGroupId } from '../../utils/teamcity/group-settings.js'
import { fetchYcGroupSettingsByGroupId } from '../../utils/yc/group-settings.js'
import { requireOteAdmin } from '../../utils/require-ote-admin.js'

/**
 * Матрица «группа → TeamCity + каталог YC» (только admin).
 */
export default defineEventHandler(async (event) => {
  const { db } = await requireOteAdmin(event)
  const groups = await listAppGroupsOrdered(db)
  const rows = []
  for (const grp of groups) {
    const s = await fetchTeamCityGroupSettingsByGroupId(db, grp.id)
    const yc = await fetchYcGroupSettingsByGroupId(db, grp.id)
    rows.push({
      group: {
        id: grp.id,
        code: grp.code,
        name: grp.name,
        isSystem: Boolean(grp.isSystem),
      },
      settings: s
        ? {
            ...s,
            ycFolderId: yc?.ycFolderId ?? '',
          }
        : null,
    })
  }
  return { rows }
})
