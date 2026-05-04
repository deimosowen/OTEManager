import { listAppGroupsOrdered } from '../../../utils/ote-app-groups.js'
import { requireOteAdmin } from '../../../utils/require-ote-admin.js'

function ts(v) {
  if (v instanceof Date) return v.toISOString()
  return new Date(v).toISOString()
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const { db } = await requireOteAdmin(event)
  const groupRows = await listAppGroupsOrdered(db)
  const groups = groupRows.map((g) => ({
    id: Number(g.id),
    code: String(g.code || ''),
    name: String(g.name || ''),
    isSystem: Boolean(Number(g.isSystem)),
    createdAt: ts(g.createdAt),
    updatedAt: ts(g.updatedAt),
  }))
  return { groups }
})
