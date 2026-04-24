import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))
const constantsDir = fileURLToPath(new URL('./src/constants', import.meta.url))

/**
 * Vitest без полного Nuxt-рантайма: алиасы как в приложении (`~/` → `src/`).
 * Подходит для чистых функций, Pinia-сторов и будущих тестов с @vue/test-utils.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/stores/**', 'src/constants/**'],
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
