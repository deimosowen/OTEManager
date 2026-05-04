import { createError } from 'h3'
import { eq } from 'drizzle-orm'
import { AUDIT_ACTION, AUDIT_APP_GROUP_RESOURCE_PREFIX } from '@app-constants/audit.js'
import { oteAppGroups } from '../../../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../utils/audit-log.js'
import { renameAppGroup } from '../../../utils/ote-app-groups.js'
import { requireOteAdmin } from '../../../utils/require-ote-admin.js'

function parseId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

export default defineEventHandler(async (event) => {
  const { user, db } = await requireOteAdmin(event)
  const id = parseId(event.context.params?.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Некорректный id группы' })
  }
  const body = await readBody(event)
  const name = String(body?.name ?? '').trim()
  const prevRows = await db.select({ name: oteAppGroups.name }).from(oteAppGroups).where(eq(oteAppGroups.id, id)).limit(1)
  const prevName = prevRows[0]?.name ?? null
  const updated = await renameAppGroup(db, id, name)

  await recordAuditEvent(
    auditPayloadFromUser(user, {
      actionCode: AUDIT_ACTION.APP_GROUP_RENAME,
      oteResourceId: `${AUDIT_APP_GROUP_RESOURCE_PREFIX}${id}`,
      oteTag: updated.name,
      details: { prevName, nextName: updated.name },
    }),
  )

  return { group: updated }
})
