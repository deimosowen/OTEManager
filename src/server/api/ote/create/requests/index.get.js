import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { getDb } from '../../../../db/client.js'
import { oteTcCreations } from '../../../../db/schema.js'
import { integrationUserKey } from '../../../../utils/integrations/user-credentials.js'
import { syncOteTcCreationRow } from '../../../../utils/ote-tc-creation-sync.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'

const ACTIVE = /** @type {const} */ (['queued', 'running'])

/**
 * Активные запросы создания OTE текущего пользователя (очередь / выполняется).
 * После синхронизации с TeamCity завершённые записи не возвращаются.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')

  const user = requireOteUser(event)
  const key = integrationUserKey(user)
  const email = String(user?.email || '').trim()

  const actorMatch = email
    ? or(eq(oteTcCreations.actorLogin, key), eq(oteTcCreations.actorEmail, email))
    : eq(oteTcCreations.actorLogin, key)

  const db = getDb()
  const rows = await db
    .select()
    .from(oteTcCreations)
    .where(and(inArray(oteTcCreations.status, ACTIVE), actorMatch))
    .orderBy(desc(oteTcCreations.createdAt))
    .limit(25)

  const config = useRuntimeConfig(event)
  const out = []
  for (const row of rows) {
    try {
      const synced = await syncOteTcCreationRow(config, user, row)
      if (synced && (synced.status === 'queued' || synced.status === 'running')) {
        out.push(synced)
      }
    } catch {
      /* пропускаем проблемную строку, остальные активности покажем */
    }
  }

  return { creations: out }
})
