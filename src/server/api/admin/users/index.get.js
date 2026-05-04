import { desc, eq } from 'drizzle-orm'
import { appRoles, oteAppGroups, oteDirectoryUsers } from '../../../db/schema.js'
import { listAppGroupsOrdered } from '../../../utils/ote-app-groups.js'
import { fetchRoleCodesForUserKey } from '../../../utils/rbac/bootstrap.js'
import { requireOteAdmin } from '../../../utils/require-ote-admin.js'

function ts(v) {
  if (v instanceof Date) return v.toISOString()
  return new Date(v).toISOString()
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const { db } = await requireOteAdmin(event)

  const roleMeta = await db
    .select({ code: appRoles.code, label: appRoles.label, sortOrder: appRoles.sortOrder })
    .from(appRoles)
    .orderBy(appRoles.sortOrder)

  const groupRows = await listAppGroupsOrdered(db)

  const rows = await db
    .select({
      userKey: oteDirectoryUsers.userKey,
      email: oteDirectoryUsers.email,
      login: oteDirectoryUsers.login,
      displayName: oteDirectoryUsers.displayName,
      firstSeenAt: oteDirectoryUsers.firstSeenAt,
      lastSeenAt: oteDirectoryUsers.lastSeenAt,
      groupId: oteDirectoryUsers.groupId,
      groupCode: oteAppGroups.code,
      groupName: oteAppGroups.name,
      groupIsSystem: oteAppGroups.isSystem,
    })
    .from(oteDirectoryUsers)
    .innerJoin(oteAppGroups, eq(oteDirectoryUsers.groupId, oteAppGroups.id))
    .orderBy(desc(oteDirectoryUsers.lastSeenAt))

  const users = []
  for (const r of rows) {
    const roleCodes = await fetchRoleCodesForUserKey(db, r.userKey)
    users.push({
      userKey: r.userKey,
      email: r.email,
      login: r.login,
      displayName: r.displayName,
      firstSeenAt: ts(r.firstSeenAt),
      lastSeenAt: ts(r.lastSeenAt),
      roleCodes,
      group: {
        id: Number(r.groupId),
        code: String(r.groupCode || ''),
        name: String(r.groupName || ''),
        isSystem: Boolean(Number(r.groupIsSystem)),
      },
    })
  }

  const groups = groupRows.map((g) => ({
    id: Number(g.id),
    code: String(g.code || ''),
    name: String(g.name || ''),
    isSystem: Boolean(Number(g.isSystem)),
    createdAt: ts(g.createdAt),
    updatedAt: ts(g.updatedAt),
  }))

  return { users, roles: roleMeta, groups }
})
