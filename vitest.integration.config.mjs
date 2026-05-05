import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const srcDir = fileURLToPath(new URL('./src', import.meta.url))
const constantsDir = fileURLToPath(new URL('./src/constants', import.meta.url))

/** Интеграционные тесты: реальный процесс Nitro из `.output`, без `environment: nuxt`. */
export default defineConfig({
  resolve: {
    alias: {
      '~': srcDir,
      '@': srcDir,
      '@app-constants': constantsDir,
    },
  },
  test: {
    root: rootDir,
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.spec.js'],
    testTimeout: 120000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
})
