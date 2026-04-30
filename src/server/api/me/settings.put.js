import { attachTimezoneToPublicUser, upsertUserTimezone } from '../../utils/user-settings.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'

/**
 * Часовой пояс для отображения дат (IANA).
 * Тело: `{ "timezone": "Europe/Moscow" }`.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const body = await readBody(event)
  const raw = body && typeof body.timezone === 'string' ? body.timezone : ''
  await upsertUserTimezone(user, raw)
  const next = await attachTimezoneToPublicUser(user)
  return { ok: true, timezone: next?.timezone ?? '' }
})
