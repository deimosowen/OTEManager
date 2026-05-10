import { eq } from 'drizzle-orm'
import {
  announcementToPublicPayload,
  isRegisteredFeatureAnnouncementId,
  pickNextFeatureAnnouncement,
} from '@app-constants/feature-announcements.js'
import { userSettings } from '../db/schema.js'
import { getDb } from '../db/client.js'
import { integrationUserKey } from './integrations/user-credentials.js'
import { DEFAULT_USER_TIMEZONE, getTimezoneForUser } from './user-settings.js'

const MAX_STORED_IDS = 200

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseFeatureAnnouncementsDismissedJson(raw) {
  if (raw == null || raw === '') return []
  try {
    const j = JSON.parse(String(raw))
    if (!Array.isArray(j)) return []
    const ids = [...new Set(j.map((x) => String(x || '').trim()).filter(Boolean))]
    return ids.slice(0, MAX_STORED_IDS)
  } catch {
    return []
  }
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} userKey
 */
export async function getDismissedFeatureAnnouncementIds(db, userKey) {
  const key = String(userKey || '').trim()
  if (!key) return []
  const rows = await db
    .select({ raw: userSettings.featureAnnouncementsDismissed })
    .from(userSettings)
    .where(eq(userSettings.userLogin, key))
    .limit(1)
  return parseFeatureAnnouncementsDismissedJson(rows[0]?.raw)
}

/**
 * Следующий анонс для показа или null.
 *
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {string} userKey
 */
export async function getPendingFeatureAnnouncementPayload(db, userKey) {
  const dismissed = await getDismissedFeatureAnnouncementIds(db, userKey)
  const next = pickNextFeatureAnnouncement(dismissed)
  return announcementToPublicPayload(next)
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {Record<string, unknown> | null} publicUser
 */
export async function attachFeatureAnnouncementsToPublicUser(db, publicUser) {
  if (!publicUser || typeof publicUser !== 'object') return publicUser
  const key = integrationUserKey(publicUser)
  if (!key) return { ...publicUser, pendingFeatureAnnouncement: null }
  try {
    const pending = await getPendingFeatureAnnouncementPayload(db, key)
    return { ...publicUser, pendingFeatureAnnouncement: pending }
  } catch {
    return { ...publicUser, pendingFeatureAnnouncement: null }
  }
}

/**
 * @param {{ login?: string, email?: string, id?: string }} user
 * @param {string} announcementId
 */
export async function dismissFeatureAnnouncementForUser(user, announcementId) {
  const id = String(announcementId || '').trim()
  if (!isRegisteredFeatureAnnouncementId(id)) {
    throw createError({ statusCode: 400, message: 'Неизвестный анонс' })
  }
  const key = integrationUserKey(user)
  if (!key) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя с настройками' })
  }
  const db = getDb()
  const now = new Date()
  const timezone = await getTimezoneForUser(user)
  const tz = typeof timezone === 'string' && timezone.trim() ? timezone.trim() : DEFAULT_USER_TIMEZONE

  const prev = await getDismissedFeatureAnnouncementIds(db, key)
  const nextList = prev.includes(id) ? prev : [...prev, id]
  const json = JSON.stringify(nextList.slice(0, MAX_STORED_IDS))

  await db
    .insert(userSettings)
    .values({
      userLogin: key,
      timezone: tz,
      onboardingHintsDismissed: 0,
      featureAnnouncementsDismissed: json,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userLogin,
      set: {
        featureAnnouncementsDismissed: json,
        updatedAt: now,
      },
    })

  const pending = announcementToPublicPayload(pickNextFeatureAnnouncement(nextList))
  return { ok: true, pendingFeatureAnnouncement: pending }
}
