import { eq } from 'drizzle-orm'
import { DEFAULT_USER_TIMEZONE } from '@app-constants/user-timezone.js'
import { getDb } from '../db/client.js'
import { userSettings } from '../db/schema.js'
import { integrationUserKey } from './integrations/user-credentials.js'

export { DEFAULT_USER_TIMEZONE }

export function isValidIanaTimeZone(tz) {
  if (typeof tz !== 'string' || !tz.trim()) return false
  const z = tz.trim()
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat(undefined, { timeZone: z })
    return true
  } catch {
    return false
  }
}

/**
 * @param {{ login?: string, email?: string, id?: string } | null} user
 */
export async function getTimezoneForUser(user) {
  const key = integrationUserKey(user)
  if (!key) return DEFAULT_USER_TIMEZONE
  const db = getDb()
  const rows = await db
    .select({ timezone: userSettings.timezone })
    .from(userSettings)
    .where(eq(userSettings.userLogin, key))
    .limit(1)
  const tz = rows[0]?.timezone
  if (typeof tz === 'string' && tz.trim()) return tz.trim()
  return DEFAULT_USER_TIMEZONE
}

/**
 * @param {{ login?: string, email?: string, id?: string }} user
 * @param {string} timezone — IANA, например `Europe/Moscow`
 */
export async function upsertUserTimezone(user, timezone) {
  const key = integrationUserKey(user)
  if (!key) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя с записью настроек' })
  }
  const trimmed = String(timezone || '').trim()
  if (!isValidIanaTimeZone(trimmed)) {
    throw createError({ statusCode: 400, message: 'Некорректная таймзона IANA' })
  }
  const db = getDb()
  const now = new Date()
  await db
    .insert(userSettings)
    .values({
      userLogin: key,
      timezone: trimmed,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userLogin,
      set: { timezone: trimmed, updatedAt: now },
    })
  return trimmed
}

/**
 * @param {{ id?: string, login?: string, email?: string } | null} publicUser — после `mapOteSessionToPublicUser`
 */
export async function attachTimezoneToPublicUser(publicUser) {
  if (!publicUser) return null
  const timezone = await getTimezoneForUser(publicUser)
  return { ...publicUser, timezone }
}
