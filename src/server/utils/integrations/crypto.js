import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const BLOB_PREFIX = 'otegcm1:'
const KDF_SALT = 'ote-user-integration-v1'

/**
 * @param {string} masterSecret NUXT_SESSION_SECRET (или отдельный ключ при появлении)
 */
function deriveKey(masterSecret) {
  return scryptSync(String(masterSecret || ''), KDF_SALT, 32)
}

/**
 * @param {string} masterSecret
 * @param {Record<string, unknown>} plainObj
 * @returns {string}
 */
export function encryptIntegrationPayload(masterSecret, plainObj) {
  const key = deriveKey(masterSecret)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const plain = JSON.stringify(plainObj)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const buf = Buffer.concat([iv, tag, enc])
  return `${BLOB_PREFIX}${buf.toString('base64url')}`
}

/**
 * @param {string} masterSecret
 * @param {string} blob
 * @returns {Record<string, unknown> | null}
 */
export function decryptIntegrationPayload(masterSecret, blob) {
  if (!blob || typeof blob !== 'string' || !blob.startsWith(BLOB_PREFIX)) return null
  const raw = blob.slice(BLOB_PREFIX.length)
  let buf
  try {
    buf = Buffer.from(raw, 'base64url')
  } catch {
    return null
  }
  if (buf.length < 12 + 16 + 1) return null
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const enc = buf.subarray(28)
  try {
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(masterSecret), iv)
    decipher.setAuthTag(tag)
    const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}
