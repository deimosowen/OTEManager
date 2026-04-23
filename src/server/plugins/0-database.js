import { initDatabase } from '../db/client.js'

/**
 * Инициализация SQLite + применение миграций Drizzle до обработки запросов.
 * Порядок: имя файла `0-database` идёт раньше `00-command-queue`.
 */
export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  await initDatabase(config)
})
