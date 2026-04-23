import { Session } from '@yandex-cloud/nodejs-sdk'
import { loadServiceAccountCredentials } from './sa-credentials.js'

/**
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @returns {import('@yandex-cloud/nodejs-sdk').Session | null}
 */
export function createYandexCloudSession(config) {
  const creds = loadServiceAccountCredentials(config)
  if (!creds) return null
  return new Session({ serviceAccountJson: creds })
}
