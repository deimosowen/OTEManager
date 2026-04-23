import { defineConfig } from 'drizzle-kit'

/** Конфиг drizzle-kit: схема, выход SQL-миграций, SQLite (файл для kit/studio). */
export default defineConfig({
  schema: './src/server/db/schema.js',
  out: './src/server/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./data/ote.sqlite',
  },
})
