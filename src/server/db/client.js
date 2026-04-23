import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import * as schema from './schema.js'
import { resolveMigrationsDir } from './resolve-migrations-dir.js'

/** @type {import('drizzle-orm/libsql').LibSQLDatabase<typeof schema> | null} */
let dbInstance = null

/**
 * Абсолютный путь к файлу SQLite из runtimeConfig (`sqlitePath`).
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 */
export function resolveSqliteFilePath(config) {
  const raw = (config?.sqlitePath && String(config.sqlitePath).trim()) || 'data/ote.sqlite'
  if (isAbsolute(raw)) return raw
  return resolve(process.cwd(), raw)
}

/**
 * URL для @libsql/client (локальный файл).
 * @param {string} filePath
 */
function filePathToLibsqlUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.startsWith('/')) return `file:${normalized}`
  if (/^[a-zA-Z]:\//.test(normalized)) return `file:///${normalized}`
  return `file:${normalized}`
}

/**
 * Один раз при старте Nitro: миграции + drizzle-клиент.
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 */
export async function initDatabase(config) {
  if (dbInstance) return dbInstance
  const filePath = resolveSqliteFilePath(config)
  mkdirSync(dirname(filePath), { recursive: true })
  const url = filePathToLibsqlUrl(filePath)
  const client = createClient({ url })
  const db = drizzle(client, { schema })
  const migrationsFolder = resolveMigrationsDir(config?.sqliteMigrationsDir)
  await migrate(db, { migrationsFolder })
  dbInstance = db
  return dbInstance
}

/**
 * Drizzle-после `initDatabase` (вызывается из плагина до обработки запросов).
 */
export function getDb() {
  if (!dbInstance) {
    throw new Error(
      'База не инициализирована: дождитесь плагина 0-database или вызовите initDatabase() из Nitro.',
    )
  }
  return dbInstance
}

/** Для тестов / graceful shutdown (если понадобится). */
export function resetDatabaseSingletonForTests() {
  dbInstance = null
}
