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

/** @param {unknown} err */
function formatDbMigrationError(err) {
  if (err == null) return 'unknown error'
  if (typeof err === 'string') return err
  if (err instanceof Error) {
    const parts = [err.message]
    const c = /** @type {{ cause?: unknown }} */ (err).cause
    if (c instanceof Error) parts.push(`cause: ${c.message}`)
    else if (c != null && typeof c === 'object' && 'message' in c) parts.push(`cause: ${String(/** @type {{ message: unknown }} */ (c).message)}`)
    return parts.join(' | ')
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
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
  // eslint-disable-next-line no-console
  console.log('[db] sqlitePath:', filePath)
  // eslint-disable-next-line no-console
  console.log('[db] migrationsFolder:', migrationsFolder)

  try {
    await migrate(db, { migrationsFolder })
  } catch (e) {
    const detail = formatDbMigrationError(e)
    // eslint-disable-next-line no-console
    console.error('[db] Ошибка миграции SQLite (drizzle migrate):', detail)
    if (e instanceof Error && e.stack) {
      // eslint-disable-next-line no-console
      console.error(e.stack)
    }
    throw new Error(
      `Миграция БД не выполнилась. sqlitePath=${filePath}; migrationsFolder=${migrationsFolder}. Детали: ${detail}`,
      { cause: e instanceof Error ? e : undefined },
    )
  }

  try {
    const requiredTables = [
      'app_roles',
      'ote_app_groups',
      'ote_build_templates',
      'ote_directory_users',
      'ote_user_role_assignments',
      'ote_group_teamcity_settings',
      'ote_group_yc_settings',
    ]
    for (const name of requiredTables) {
      const t = await client.execute({
        sql: "select name from sqlite_master where type='table' and name = ? limit 1",
        args: [name],
      })
      if (!Array.isArray(t.rows) || t.rows.length === 0) {
        throw new Error(
          `Схема БД неполная: нет таблицы «${name}». Проверьте папку миграций и meta/_journal.json. ` +
            `sqlitePath=${filePath}; migrationsFolder=${migrationsFolder}`,
        )
      }
    }
    const roles = await client.execute({ sql: 'select count(*) as n from app_roles', args: [] })
    const n = Number(roles.rows?.[0]?.n ?? 0)
    if (n < 2) {
      throw new Error(
        `Схема БД неполная: в app_roles ожидаются минимум 2 строки (роли user/admin), сейчас ${n}. ` +
          `sqlitePath=${filePath}; migrationsFolder=${migrationsFolder}`,
      )
    }
    const defG = await client.execute({
      sql: "select id from ote_app_groups where code = 'default' limit 1",
      args: [],
    })
    if (!Array.isArray(defG.rows) || defG.rows.length === 0) {
      throw new Error(
        `Схема БД неполная: нет системной группы (ote_app_groups.code = 'default'). ` +
          `sqlitePath=${filePath}; migrationsFolder=${migrationsFolder}`,
      )
    }
    const orphanDir = await client.execute({
      sql: 'select count(*) as n from ote_directory_users where group_id is null',
      args: [],
    })
    const orphanN = Number(orphanDir.rows?.[0]?.n ?? 0)
    if (orphanN > 0) {
      throw new Error(
        `Схема БД неполная: у ${orphanN} пользователей каталога не задан group_id. ` +
          `Проверьте миграцию 0015_ote_app_groups. sqlitePath=${filePath}; migrationsFolder=${migrationsFolder}`,
      )
    }
  } catch (e) {
    const detail = formatDbMigrationError(e)
    // eslint-disable-next-line no-console
    console.error('[db] Ошибка проверки схемы после миграций:', detail)
    if (e instanceof Error && e.stack) {
      // eslint-disable-next-line no-console
      console.error(e.stack)
    }
    throw new Error(
      `База в нерабочем состоянии после миграций. sqlitePath=${filePath}; migrationsFolder=${migrationsFolder}. Детали: ${detail}`,
      { cause: e instanceof Error ? e : undefined },
    )
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
