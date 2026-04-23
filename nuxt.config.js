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
  /**
   * Абсолютный алиас для `src/constants` — иначе в dev Nitro иногда резолвит
   * `~/constants/…` и относительные пути в `D:\\src\\constants\\...` (без каталога проекта).
   */
  alias: {
    '@app-constants': resolve(__nuxtRoot, 'src/constants'),
  },
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
    /**
     * SQLite (Drizzle + @libsql/client): путь к файлу БД от корня репозитория или абсолютный.
     * Миграции: `src/server/db/migrations` (dev) / копия в `.output/server/db/migrations` после `postbuild`.
     */
    sqlitePath: envPick('NUXT_SQLITE_PATH', 'data/ote.sqlite'),
    /** Пусто — авто; иначе абсолютный путь к папке с SQL + meta/_journal.json */
    sqliteMigrationsDir: envPick('NUXT_SQLITE_MIGRATIONS_DIR', ''),
    /** Yandex Cloud: каталог с ВМ (folder id из консоли). */
    ycFolderId: envPick('NUXT_YC_FOLDER_ID'),
    /** Путь к JSON-ключу сервисного аккаунта (от корня репозитория или абсолютный). */
    ycSaKeyPath: envPick('NUXT_YC_SA_KEY_PATH'),
    /** Либо сам JSON ключа в одной строке (без переносов) — нежелательно для прод. */
    ycSaJson: envPick('NUXT_YC_SERVICE_ACCOUNT_JSON'),
    /** Метка ВМ для отбора OTE (по умолчанию как в консоли). */
    ycInstanceLabelKey: envPick('NUXT_YC_INSTANCE_LABEL_KEY', 'metadata-tag'),
    /** Если задано — только ВМ с таким значением метки. */
    ycInstanceLabelValue: envPick('NUXT_YC_INSTANCE_LABEL_VALUE'),
    /** Группировка ВМ в одну строку списка (MVP: одна OTE = одно значение `metadata-tag`). */
    ycGroupByLabelKey: envPick('NUXT_YC_GROUP_BY_LABEL_KEY', 'metadata-tag'),
    /** Метка автора OTE (MVP). */
    ycOteAuthorLabelKey: envPick('NUXT_YC_OTE_AUTHOR_LABEL', 'run-by'),
    /** Версия бэка: перебор меток по порядку. */
    ycOteVersionBackendLabelKeys: envPick(
      'NUXT_YC_OTE_VERSION_BACKEND_LABELS',
      'caseone-version,caseone_version,backend-version,backend_version',
    ),
    /** Версия фронта: перебор меток по порядку. */
    ycOteVersionFrontendLabelKeys: envPick(
      'NUXT_YC_OTE_VERSION_FRONTEND_LABELS',
      'frontend-version,frontend_version,ui-version,caseone-ui-version',
    ),
    /** URL приложения: метки (через запятую). */
    ycOteAppUrlLabelKeys: envPick('NUXT_YC_OTE_APP_URL_LABELS', 'ote-url,app-url,public-url'),
    /** URL приложения: ключи user metadata. */
    ycOteAppUrlMetaKeys: envPick('NUXT_YC_OTE_APP_URL_META_KEYS', 'app_url,app-url,public_url'),
    /**
     * Публичный URL приложения, если нет в метках/metadata: подставить `{slug}` (метка OTE, напр. metadata-tag, иначе имя ВМ без `-app`/`-everything`).
     * Пример: https://{slug}.caseone.devpravo.tech
     */
    ycOteAppPublicUrlTemplate: envPick(
      'NUXT_YC_OTE_APP_PUBLIC_URL_TEMPLATE',
      'https://{slug}.caseone.devpravo.tech',
    ),
    /** Если нет явного URL и шаблона — собрать `https://` + FQDN ВМ (внутренний *.internal; обычно не нужен). */
    ycOteAppHttpsFromFqdn: envPick('NUXT_YC_OTE_APP_HTTPS_FROM_FQDN', 'false'),
    /** Метки ВМ с логином владельца (через запятую) — для таблицы как в TeamCity. */
    ycTcUsernameLabelKeys: envPick('NUXT_YC_USERNAME_LABEL_KEYS', 'username,ldap-user,owner,login'),
    /** Где искать дату автоудаления: ключи меток (через запятую). */
    ycTcDeleteDateLabelKeys: envPick(
      'NUXT_YC_DELETE_DATE_LABEL_KEYS',
      'delete-date,delete_date,delete-until,autodelete-date',
    ),
    /** Дата удаления в user metadata (через запятую; нужен FULL при list — уже включён). */
    ycTcDeleteDateMetaKeys: envPick(
      'NUXT_YC_DELETE_DATE_META_KEYS',
      'delete-date,delete_date,deleteDate,autodelete-date',
    ),
    /** Ключи user metadata с JSON/текстом конфига, передаваемым в ТС (через запятую, порядок важен). */
    ycOteTcConfigMetaKeys: envPick(
      'NUXT_YC_OTE_TC_CONFIG_META_KEYS',
      'tc_config,ote_config_json,teamcity_parameters,tc-config',
    ),
    /** Альтернатива: ключи меток с тем же конфигом (через запятую). */
    ycOteTcConfigLabelKeys: envPick('NUXT_YC_OTE_TC_CONFIG_LABEL_KEYS', ''),
    /** Один ключ metadata: JSON-массив истории развёртываний (at, versionBackend, versionFrontend, …). */
    ycOteDeploymentHistoryMetaKey: envPick('NUXT_YC_OTE_DEPLOYMENT_HISTORY_META_KEY', 'deployment-history'),
    /** Квоты для блока «как в TeamCity» (суммы по всем отфильтрованным ВМ). */
    ycQuotaMaxCpu: envPick('NUXT_YC_QUOTA_MAX_CPU', '400'),
    ycQuotaMaxMemoryGb: envPick('NUXT_YC_QUOTA_MAX_MEMORY_GB', '1000'),
    /** Базовый URL REST TeamCity (без хвостового /). */
    tcRestBaseUrl: envPick('NUXT_TC_REST_BASE_URL', 'https://ci.pravo.tech'),
    /** Персональный токен TeamCity для REST: заголовок `Authorization: Bearer` (см. справку JetBrains по token.value). */
    tcAccessToken: envPick('NUXT_TC_ACCESS_TOKEN'),
    /** Альтернатива токену: логин/пароль к TeamCity. */
    tcUsername: envPick('NUXT_TC_USERNAME'),
    tcPassword: envPick('NUXT_TC_PASSWORD'),
    /** Конфигурации сборок Start/Stop/Delete по metadata.tag. */
    tcStartBuildTypeId: envPick('NUXT_TC_START_BUILD_TYPE_ID', 'CasePro_UniversalDeploy_StartByTag'),
    tcStopBuildTypeId: envPick('NUXT_TC_STOP_BUILD_TYPE_ID', 'CasePro_UniversalDeploy_StopByTag'),
    tcDeleteBuildTypeId: envPick('NUXT_TC_DELETE_BUILD_TYPE_ID', 'CasePro_UniversalDeploy_Delete'),
    public: {
      /** Явно из .env.local / process.env — иначе на клиенте иногда остаётся пусто при srcDir. */
      yandexClientId: envPick('NUXT_PUBLIC_YANDEX_CLIENT_ID'),
      siteUrl: envPick('NUXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
      /**
       * Ссылка на профиль автора OTE вне приложения: подставьте `{user}` или `{login}`.
       * Пример: https://staff.example.com/users/{user}
       */
      profileExternalUrlTemplate: envPick('NUXT_PUBLIC_PROFILE_URL_TEMPLATE'),
      /**
       * Хост для ссылок CaseOne (без схемы): `{tag}.{host}`. Пусто — из шаблона `ycOteAppPublicUrlTemplate` или devpravo.tech.
       */
      oteAppLinksHost: envPick('NUXT_PUBLIC_OTE_APP_LINKS_HOST', ''),
      /** Порт RabbitMQ management (http на IP ВМ с rabbit). */
      oteRabbitManagementPort: envPick('NUXT_PUBLIC_OTE_RABBIT_MANAGEMENT_PORT', '15672'),
      /**
       * URL веб-интерфейса TeamCity (подсказки в профиле). По умолчанию совпадает с типичным REST-хостом.
       * Можно задать отдельно, если UI и API на разных хостах.
       */
      teamcityUiBaseUrl: envPick('NUXT_PUBLIC_TC_UI_BASE_URL', 'https://ci.pravo.tech').replace(/\/+$/, ''),
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
