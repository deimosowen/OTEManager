import { AUDIT_ACTION, AUDIT_APP_GROUP_RESOURCE_PREFIX } from '@app-constants/audit.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../utils/audit-log.js'
import { createAppGroup } from '../../../utils/ote-app-groups.js'
import { requireOteAdmin } from '../../../utils/require-ote-admin.js'

export default defineEventHandler(async (event) => {
  const { user, db } = await requireOteAdmin(event)
  const body = await readBody(event)
  const name = String(body?.name ?? '').trim()
  const created = await createAppGroup(db, name)

  await recordAuditEvent(
    auditPayloadFromUser(user, {
      actionCode: AUDIT_ACTION.APP_GROUP_CREATE,
      oteResourceId: `${AUDIT_APP_GROUP_RESOURCE_PREFIX}${created.id}`,
      oteTag: created.name,
      details: { id: created.id, code: created.code, name: created.name },
    }),
  )

  return { group: created }
})
