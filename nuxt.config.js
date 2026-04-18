// https://nuxt.com/docs/api/configuration/nuxt-config
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Корень репозитория (рядом с этим файлом) */
const __nuxtRoot = dirname(fileURLToPath(import.meta.url))

/** Значения из .env / .env.local — подставляем в runtimeConfig явно (Nuxt merge + process.env не всегда успевают при srcDir/serverDir). */
const _envFromFiles = Object.create(null)

function mergeEnvFile(relativeName) {
  const full = resolve(__nuxtRoot, relativeName)
  if (!existsSync(full)) return
  let text = readFileSync(full, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim()
    if (!s || s.startsWith('#')) continue
    const eq = s.indexOf('=')
    if (eq === -1) continue
    const key = s.slice(0, eq).trim()
    if (!key) continue
    let val = s.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    val = val.replace(/\r/g, '').trim()
    _envFromFiles[key] = val
  }
}

mergeEnvFile('.env')
mergeEnvFile('.env.local')

for (const k of Object.keys(_envFromFiles)) {
  process.env[k] = _envFromFiles[k]
}

function envPick(key, fallback = '') {
  if (Object.prototype.hasOwnProperty.call(_envFromFiles, key)) return _envFromFiles[key]
  const fromProcess = process.env[key]
  if (fromProcess !== undefined) return String(fromProcess).replace(/\r/g, '').trim()
  return fallback
}

export default defineNuxtConfig({
  /** Исходники приложения — в `src/` (корень репозитория для конфигов и Git) */
  srcDir: 'src/',
  /** Nitro: API, server middleware, только Node — рядом с приложением, один корень для деплоя/поддержки */
  serverDir: 'src/server',
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  runtimeConfig: {
    /** Секреты не подставляем в дефолты из файлов — только merge из process.env (мы заполнили его из .env.local выше). */
    yandexClientSecret: '',
    sessionSecret: '',
    allowedEmailDomains: '',
    public: {
      /** Явно из .env.local / process.env — иначе на клиенте иногда остаётся пусто при srcDir. */
      yandexClientId: envPick('NUXT_PUBLIC_YANDEX_CLIENT_ID'),
      siteUrl: envPick('NUXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
    },
  },
  /**
   * Имена компонентов = имя файла (PascalCase), без префикса папки.
   * Иначе `components/layout/AppToastHost.vue` становится `LayoutAppToastHost`, а в разметке — `AppToastHost`.
   */
  components: [{ path: '~/components', pathPrefix: false }],
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'OTE Manager',
      htmlAttrs: { lang: 'ru' },
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
        },
      ],
    },
  },
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },
  typescript: {
    strict: false,
    typeCheck: false,
  },
})
