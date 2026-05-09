import { eq } from 'drizzle-orm'
import { userHasAdminRole } from '@app-constants/rbac.js'
import { oteDirectoryUsers, userSettings } from '../db/schema.js'
import { getDb } from '../db/client.js'
import { integrationUserKey } from './integrations/user-credentials.js'
import { DEFAULT_USER_TIMEZONE, getTimezoneForUser } from './user-settings.js'

/** Порог «нового» пользователя каталога от `first_seen_at`: старше — подсказки не показываем. */
export const ONBOARDING_NEW_USER_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000

/**
 * @param {number} firstSeenAtMs
 * @param {number} nowMs
 */
export function isCatalogUserNewForOnboarding(firstSeenAtMs, nowMs = Date.now()) {
  const age = nowMs - firstSeenAtMs
  return Number.isFinite(age) && age >= 0 && age <= ONBOARDING_NEW_USER_MAX_AGE_MS
}

function firstSeenToMs(ts) {
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts === 'number') return ts
  return NaN
}

/**
 * Нужно ли показывать блок подсказок (только «свежие» записи каталога и без dismiss).
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} userKey
 * @param {number} [nowMs]
 */
export async function computeShowOnboardingHints(db, userKey, nowMs = Date.now()) {
  const dirRows = await db
    .select({ firstSeenAt: oteDirectoryUsers.firstSeenAt })
    .from(oteDirectoryUsers)
    .where(eq(oteDirectoryUsers.userKey, userKey))
    .limit(1)
  const fs = firstSeenToMs(dirRows[0]?.firstSeenAt)
  if (!Number.isFinite(fs)) return false
  if (!isCatalogUserNewForOnboarding(fs, nowMs)) return false

  const setRows = await db
    .select({ d: userSettings.onboardingHintsDismissed })
    .from(userSettings)
    .where(eq(userSettings.userLogin, userKey))
    .limit(1)
  if (Number(setRows[0]?.d) === 1) return false
  return true
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {Record<string, unknown> | null} publicUser — после rbac/timezone
 */
export async function attachOnboardingHintsToPublicUser(db, publicUser) {
  if (!publicUser || typeof publicUser !== 'object') return publicUser
  if (userHasAdminRole(publicUser.roles)) return { ...publicUser, showOnboardingHints: false }
  const key = integrationUserKey(publicUser)
  if (!key) return { ...publicUser, showOnboardingHints: false }
  try {
    const show = await computeShowOnboardingHints(db, key)
    return { ...publicUser, showOnboardingHints: show }
  } catch {
    return { ...publicUser, showOnboardingHints: false }
  }
}

/**
 * Закрыть подсказки для текущего пользователя (настройки в SQLite).
 *
 * @param {{ login?: string, email?: string, id?: string }} user
 */
export async function dismissOnboardingHintsForUser(user) {
  const key = integrationUserKey(user)
  if (!key) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя с настройками' })
  }
  const db = getDb()
  const now = new Date()
  const timezone = await getTimezoneForUser(user)
  const tz = typeof timezone === 'string' && timezone.trim() ? timezone.trim() : DEFAULT_USER_TIMEZONE

  await db
    .insert(userSettings)
    .values({
      userLogin: key,
      timezone: tz,
      onboardingHintsDismissed: 1,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userLogin,
      set: {
        onboardingHintsDismissed: 1,
        updatedAt: now,
      },
    })
}
