import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Папка с SQL-миграциями: prod (скопировано в .output) или dev (исходники в src).
 * Переопределение: `NUXT_SQLITE_MIGRATIONS_DIR` (абсолютный путь).
 * @param {string | undefined} fromRuntimeConfig
 */
export function resolveMigrationsDir(fromRuntimeConfig) {
  const trimmed = typeof fromRuntimeConfig === 'string' ? fromRuntimeConfig.trim() : ''
  if (trimmed) return trimmed
  const cwd = process.cwd()
  const fromSrc = join(cwd, 'src', 'server', 'db', 'migrations')
  // Если запускаемся из репозитория (есть `src/`), всегда берём миграции из `src/`.
  // Иначе локальный запуск `node .output/...` может случайно подхватить устаревшие
  // миграции из `.output/` и база не будет содержать новые таблицы.
  if (existsSync(fromSrc)) return fromSrc
  const fromBuild = join(cwd, '.output', 'server', 'db', 'migrations')
  if (existsSync(fromBuild)) return fromBuild
  return fromSrc
}
