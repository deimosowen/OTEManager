import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { runtimeConfigString } from './config-helpers.js'

/**
 * Читает ключ сервисного аккаунта Yandex Cloud и приводит к виду для `Session` из `@yandex-cloud/nodejs-sdk`.
 * @param {{ ycSaJson?: unknown, ycSaKeyPath?: unknown }} config
 * @returns {{ serviceAccountId: string, accessKeyId: string, privateKey: string } | null}
 */
export function loadServiceAccountCredentials(config) {
  const inline = runtimeConfigString(config.ycSaJson, 'NUXT_YC_SERVICE_ACCOUNT_JSON')
  const relPath = runtimeConfigString(config.ycSaKeyPath, 'NUXT_YC_SA_KEY_PATH')
  let raw
  if (inline) {
    raw = inline
  } else if (relPath) {
    const p = isAbsolute(relPath) ? relPath : resolve(process.cwd(), relPath)
    if (!existsSync(p)) {
      throw new Error(`YC SA key file not found: ${p}`)
    }
    raw = readFileSync(p, 'utf8')
  } else {
    return null
  }
  const json = JSON.parse(raw)
  const serviceAccountId = json.service_account_id
  const accessKeyId = json.id
  const privateKey = json.private_key
  if (!serviceAccountId || !accessKeyId || !privateKey) {
    throw new Error('YC SA JSON must contain service_account_id, id, private_key')
  }
  return { serviceAccountId, accessKeyId, privateKey }
}
