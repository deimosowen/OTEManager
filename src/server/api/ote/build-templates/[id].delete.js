import { AUDIT_ACTION } from '@app-constants/audit.js'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteBuildTemplates } from '../../../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../utils/audit-log.js'
import { rowIsPersonal } from '../../../utils/build-template-access.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

function parseTemplateId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = parseTemplateId(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, message: 'Некорректный id' })

  const db = getDb()
  const rows = await db.select().from(oteBuildTemplates).where(eq(oteBuildTemplates.id, id)).limit(1)
  const row = rows[0]
  if (!row) throw createError({ statusCode: 404, message: 'Шаблон не найден' })

  const me = integrationUserKey(user)
  if (row.createdByLogin !== me) {
    throw createError({ statusCode: 403, message: 'Удалять шаблон может только автор' })
  }

  await db.delete(oteBuildTemplates).where(eq(oteBuildTemplates.id, id))

  if (!rowIsPersonal(row.isPersonal)) {
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: AUDIT_ACTION.OTE_BUILD_TEMPLATE_DELETE,
        oteResourceId: `build-template:${row.id}`,
        oteTag: row.name,
        details: { templateId: row.id, name: row.name },
      }),
    )
  }

  return { ok: true }
})

