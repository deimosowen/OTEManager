import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))
const constantsDir = fileURLToPath(new URL('./src/constants', import.meta.url))

/**
 * Vitest без полного Nuxt-рантайма: алиасы как в приложении (`~/` → `src/`).
 * Серверные утилиты без БД/HTTP тестируются как чистые функции; интеграции — по мере необходимости.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.js'],
    exclude: ['tests/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/utils/**',
        'src/stores/**',
        'src/constants/**',
        'src/server/utils/**/*.js',
      ],
    },
  },
  resolve: {
    alias: {
      '~': srcDir,
      '@': srcDir,
      '@app-constants': constantsDir,
    },
  },
})
