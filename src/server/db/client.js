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
  // Лог старта БД помогает быстро понять, какая БД/миграции реально используются.
  // (в dev часто удаляют не тот файл или переопределяют NUXT_SQLITE_MIGRATIONS_DIR)
  // eslint-disable-next-line no-console
  console.log('[db] sqlitePath:', filePath)
  // eslint-disable-next-line no-console
  console.log('[db] migrationsFolder:', migrationsFolder)
  await migrate(db, { migrationsFolder })

  // Smoke-check: миграции обязаны создать новые таблицы/колонки.
  // Если этого не произошло (например, устаревший meta/_journal.json в артефакте),
  // лучше упасть при старте с понятным сообщением, чем ловить "no such table" в UI.
  try {
    const t = await client.execute({
      sql: "select name from sqlite_master where type='table' and name = ? limit 1",
      args: ['ote_build_templates'],
    })
    const hasBuildTemplates = Array.isArray(t.rows) && t.rows.length > 0
    if (!hasBuildTemplates) {
      throw new Error(
        `Не применились миграции: нет таблицы ote_build_templates. ` +
          `Проверьте, что папка миграций содержит 0009_ote_build_templates.sql и meta/_journal.json включает её. ` +
          `sqlitePath=${filePath}; migrationsFolder=${migrationsFolder}`,
      )
    }
  } catch (e) {
    const msg = e?.message || String(e)
    // eslint-disable-next-line no-console
    console.error('[db] migration check failed:', msg)
    throw e
  }
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
