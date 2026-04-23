import { and, eq } from 'drizzle-orm'
import { getDb } from '../../db/client.js'
import { userIntegrationCredentials } from '../../db/schema.js'
import { encryptIntegrationPayload, decryptIntegrationPayload } from './crypto.js'

/**
 * Стабильный ключ строки в БД: логин Яндекса, иначе email, иначе sub.
 * @param {{ login?: string, email?: string, id?: string }} user
 */
export function integrationUserKey(user) {
  const login = String(user?.login || '').trim()
  if (login) return login.slice(0, 256)
  const email = String(user?.email || '').trim()
  if (email) return email.slice(0, 256)
  const id = String(user?.id || '').trim()
  return id ? id.slice(0, 256) : ''
}

/**
 * @param {string} userKey
 * @param {string} provider
 */
export async function hasUserIntegration(userKey, provider) {
  if (!userKey || !provider) return false
  const db = getDb()
  const rows = await db
    .select({ one: userIntegrationCredentials.userLogin })
    .from(userIntegrationCredentials)
    .where(
      and(eq(userIntegrationCredentials.userLogin, userKey), eq(userIntegrationCredentials.provider, provider)),
    )
    .limit(1)
  return rows.length > 0
}

/**
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {string} userKey
 * @param {string} provider
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getDecryptedIntegrationPayload(config, userKey, provider) {
  const secret = config.sessionSecret
  if (!secret || !userKey || !provider) return null
  const db = getDb()
  const rows = await db
    .select({ cipherBlob: userIntegrationCredentials.cipherBlob })
    .from(userIntegrationCredentials)
    .where(
      and(eq(userIntegrationCredentials.userLogin, userKey), eq(userIntegrationCredentials.provider, provider)),
    )
    .limit(1)
  const blob = rows[0]?.cipherBlob
  if (!blob) return null
  const data = decryptIntegrationPayload(secret, blob)
  return data && typeof data === 'object' ? data : null
}

/**
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ login?: string, email?: string, id?: string }} user
 * @param {string} provider
 * @param {Record<string, unknown>} payload объект для JSON (напр. { accessToken })
 */
export async function upsertUserIntegrationPayload(config, user, provider, payload) {
  const secret = config.sessionSecret
  if (!secret) throw new Error('sessionSecret не задан')
  const userKey = integrationUserKey(user)
  if (!userKey) throw new Error('Не удалось определить пользователя для интеграции')
  const cipher = encryptIntegrationPayload(secret, payload)
  const now = new Date()
  const db = getDb()
  await db
    .insert(userIntegrationCredentials)
    .values({
      userLogin: userKey,
      provider,
      cipherBlob: cipher,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userIntegrationCredentials.userLogin, userIntegrationCredentials.provider],
      set: { cipherBlob: cipher, updatedAt: now },
    })
}

/**
 * @param {string} userKey
 * @param {string} provider
 */
export async function deleteUserIntegration(userKey, provider) {
  if (!userKey || !provider) return
  const db = getDb()
  await db
    .delete(userIntegrationCredentials)
    .where(
      and(eq(userIntegrationCredentials.userLogin, userKey), eq(userIntegrationCredentials.provider, provider)),
    )
}
