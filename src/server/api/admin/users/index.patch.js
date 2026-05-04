import { createError } from 'h3'
import { AUDIT_ACTION } from '@app-constants/audit.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../utils/audit-log.js'
import { fetchGroupForUserKey, setUserGroupChecked } from '../../../utils/ote-app-groups.js'
import { fetchRoleCodesForUserKey } from '../../../utils/rbac/bootstrap.js'
import { replaceUserRolesChecked } from '../../../utils/rbac/replace-user-roles.js'
import { requireOteAdmin } from '../../../utils/require-ote-admin.js'

export default defineEventHandler(async (event) => {
  const { user, userKey: actorKey, db } = await requireOteAdmin(event)
  const body = await readBody(event)
  const targetUserKey = String(body?.userKey || '').trim()
  if (!targetUserKey) {
    throw createError({ statusCode: 400, message: 'Укажите userKey' })
  }

  const hasRoles = Array.isArray(body?.roleCodes)
  const hasGroup = body?.groupId !== undefined && body?.groupId !== null && body?.groupId !== ''

  if (!hasRoles && !hasGroup) {
    throw createError({ statusCode: 400, message: 'Укажите roleCodes и/или groupId' })
  }

  if (hasRoles) {
    const prev = await fetchRoleCodesForUserKey(db, targetUserKey)
    await replaceUserRolesChecked(db, actorKey, targetUserKey, body.roleCodes)
    const next = await fetchRoleCodesForUserKey(db, targetUserKey)
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: AUDIT_ACTION.USER_ROLES_UPDATE,
        oteResourceId: targetUserKey,
        oteTag: null,
        details: { prevRoleCodes: prev, nextRoleCodes: next },
      }),
    )
  }

  if (hasGroup) {
    const prevGroup = await fetchGroupForUserKey(db, targetUserKey)
    const gid = Number(body.groupId)
    if (!Number.isFinite(gid)) {
      throw createError({ statusCode: 400, message: 'Некорректный groupId' })
    }
    const nextGroup = await setUserGroupChecked(db, targetUserKey, gid)
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: AUDIT_ACTION.USER_GROUP_UPDATE,
        oteResourceId: targetUserKey,
        oteTag: null,
        details: { prevGroup, nextGroup },
      }),
    )
  }

  const roleCodes = await fetchRoleCodesForUserKey(db, targetUserKey)
  const group = await fetchGroupForUserKey(db, targetUserKey)

  return { userKey: targetUserKey, roleCodes, group }
})
