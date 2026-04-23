/**
 * Копирует SQL-миграции в артефакт Nitro, чтобы в prod `migrate()` находил папку
 * (см. resolveMigrationsDir: `.output/server/db/migrations`).
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const src = join(root, 'src', 'server', 'db', 'migrations')
const dest = join(root, '.output', 'server', 'db', 'migrations')

if (!existsSync(join(root, '.output', 'server'))) {
  console.warn('[copy-db-migrations] пропуск: нет .output/server (запустите после `nuxt build`)')
  process.exit(0)
}

if (!existsSync(src)) {
  console.warn('[copy-db-migrations] пропуск: нет', src)
  process.exit(0)
}

mkdirSync(dirname(dest), { recursive: true })
cpSync(src, dest, { recursive: true })
console.log('[copy-db-migrations]', src, '→', dest)
