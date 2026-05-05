import { requireOteUser } from '../../../../utils/require-ote-auth.js'
import { clearTcPending } from '../../../../utils/ote-tc-pending.js'

/**
 * Принудительно снять блокировку «ожидание TeamCity» (если сборка отменена вручную и т.п.).
 */
export default defineEventHandler(async (event) => {
  requireOteUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Не указан id' })
  }
  const had = await clearTcPending(id)
  return { ok: true, cleared: had }
})
