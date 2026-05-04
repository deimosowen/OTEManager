import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { instanceService } from '@yandex-cloud/nodejs-sdk/compute-v1'
import { getDb, resolveSqliteFilePath } from '../db/client.js'
import { appMeta } from '../db/schema.js'
import { resolveMigrationsDir } from '../db/resolve-migrations-dir.js'
import { integrationUserKey } from './integrations/user-credentials.js'
import { getDefaultGroupId } from './ote-app-groups.js'
import { fetchTeamCityGroupSettingsByUserKey } from './teamcity/group-settings.js'
import { fetchYcGroupSettingsByGroupId } from './yc/group-settings.js'
import { isTeamCityAuthAvailable, resolveTeamCityAuthorizationHeader } from './teamcity/resolve-auth.js'
import { createYandexCloudSession } from './yc/session.js'
import { loadServiceAccountCredentials } from './yc/sa-credentials.js'
import { runtimeConfigString } from './yc/config-helpers.js'

/**
 * @param {'ok'|'warn'|'error'} status
 * @param {string} title
 * @param {Record<string, unknown>} rest
 */
function check(status, title, rest = {}) {
  return { id: rest.id || title, title, status, ...rest }
}

function safeBasename(p) {
  try {
    return basename(String(p || '')) || '—'
  } catch {
    return '—'
  }
}

function readAppPackageMeta() {
  try {
    const p = join(process.cwd(), 'package.json')
    const j = JSON.parse(readFileSync(p, 'utf8'))
    return { name: typeof j.name === 'string' ? j.name : 'ote-manager', version: typeof j.version === 'string' ? j.version : '' }
  } catch {
    return { name: 'ote-manager', version: '' }
  }
}

function countMigrationFiles(config) {
  try {
    const dir = resolveMigrationsDir(config?.sqliteMigrationsDir)
    if (!existsSync(dir)) return { dir: safeBasename(dir), count: 0 }
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql'))
    return { dir: safeBasename(dir), count: files.length, fullDirHint: dir.length > 64 ? `…${dir.slice(-48)}` : dir }
  } catch (e) {
    return { dir: '—', count: 0, error: e?.message || String(e) }
  }
}

/**
 * Лёгкий вызов ListInstances (первая страница, мало данных).
 * @param {import('@yandex-cloud/nodejs-sdk').Session} session
 * @param {string} folderId
 */
async function ycListProbe(session, folderId) {
  const client = session.client(instanceService.InstanceServiceClient)
  const res = await client.list(
    instanceService.ListInstancesRequest.fromPartial({
      folderId,
      pageSize: 1,
      pageToken: '',
      filter: '',
      orderBy: 'name asc',
      view: instanceService.InstanceView.BASIC,
    }),
  )
  return { sampleCount: (res.instances || []).length, hasMore: Boolean(res.nextPageToken) }
}

/**
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ login?: string, email?: string, id?: string }} user — для TeamCity: персональный токен и URL из настроек группы в БД.
 */
export async function collectHealthPayload(config, user) {
  const started = Date.now()
  const pkg = readAppPackageMeta()
  const buildSha = runtimeConfigString(config.healthBuildSha, 'NUXT_BUILD_SHA')
  const checks = []

  /** @type {{ ok: boolean, ms?: number, detail?: string, pathHint?: string }} */
  let database = { ok: false }
  try {
    const t0 = Date.now()
    const db = getDb()
    await db.select().from(appMeta).limit(1)
    const ms = Date.now() - t0
    const filePath = resolveSqliteFilePath(config)
    database = {
      ok: true,
      ms,
      pathHint: safeBasename(filePath),
    }
    const mig = countMigrationFiles(config)
    checks.push(
      check(ms > 400 ? 'warn' : 'ok', 'База SQLite', {
        id: 'database',
        detail: `Отклик ${ms} ms · файл ${database.pathHint} · SQL-миграций в каталоге: ${mig.count}`,
        hints: mig.error ? [`Каталог миграций: ${mig.error}`] : mig.count === 0 ? ['Проверьте путь к папке миграций'] : [],
      }),
    )
  } catch (e) {
    database = { ok: false, detail: e?.message || String(e) }
    checks.push(
      check('error', 'База SQLite', {
        id: 'database',
        detail: database.detail || 'Нет соединения',
      }),
    )
  }

  let folderId = ''
  if (database.ok) {
    try {
      const dbProbe = getDb()
      const defId = await getDefaultGroupId(dbProbe)
      if (defId) {
        const ycRow = await fetchYcGroupSettingsByGroupId(dbProbe, defId)
        folderId = String(ycRow?.ycFolderId || '').trim()
      }
    } catch {
      folderId = ''
    }
  }
  let ycCredOk = false
  let ycCredMsg = ''
  try {
    const c = loadServiceAccountCredentials(config)
    ycCredOk = Boolean(c)
    if (!c) ycCredMsg = 'Не задан ключ (NUXT_YC_SA_KEY_PATH или NUXT_YC_SERVICE_ACCOUNT_JSON)'
  } catch (e) {
    ycCredMsg = e?.message || String(e)
  }

  if (!folderId) {
    checks.push(
      check('warn', 'Yandex Compute', {
        id: 'yc',
        detail: ycCredOk
          ? 'Ключ настроен, но для системной группы не задан каталог YC в настройках'
          : ycCredMsg || 'Не настроено',
      }),
    )
  } else if (!ycCredOk) {
    checks.push(
      check('error', 'Yandex Compute', {
        id: 'yc',
        detail: ycCredMsg || 'Ключ сервисного аккаунта не загружается',
      }),
    )
  } else {
    const session = createYandexCloudSession(config)
    if (!session) {
      checks.push(
        check('error', 'Yandex Compute', {
          id: 'yc',
          detail: 'Сессия SDK не создана',
        }),
      )
    } else {
      try {
        const t0 = Date.now()
        const probe = await ycListProbe(session, folderId)
        const ms = Date.now() - t0
        checks.push(
          check(ms > 8000 ? 'warn' : 'ok', 'Yandex Compute', {
            id: 'yc',
            detail: `API отвечает за ${ms} ms · каталог ${folderId.slice(0, 12)}… · первая страница списка ВМ: ${probe.sampleCount} строк(и)`,
          }),
        )
      } catch (e) {
        checks.push(
          check('error', 'Yandex Compute', {
            id: 'yc',
            detail: e?.message || String(e),
          }),
        )
      }
    }
  }

  let tcBase = ''
  try {
    const db = getDb()
    const ukey = integrationUserKey(user)
    const g = ukey ? await fetchTeamCityGroupSettingsByUserKey(db, ukey) : null
    tcBase = g?.tcRestBaseUrl ? String(g.tcRestBaseUrl).trim().replace(/\/+$/, '') : ''
  } catch {
    tcBase = ''
  }

  let tcAuth = false
  try {
    tcAuth = await isTeamCityAuthAvailable(config, { user })
  } catch {
    tcAuth = false
  }

  if (!tcBase) {
    checks.push(
      check('warn', 'TeamCity', {
        id: 'teamcity',
        detail: 'Для вашей группы не задан REST URL TeamCity в БД (настройки системы / группы).',
      }),
    )
  } else if (!tcAuth) {
    checks.push(
      check('warn', 'TeamCity', {
        id: 'teamcity',
        detail: `Персональный токен в профиле не настроен — запрос к ${tcBase} не выполнялся.`,
      }),
    )
  } else {
    const auth = await resolveTeamCityAuthorizationHeader(config, { user })
    if (!auth) {
      checks.push(
        check('warn', 'TeamCity', {
          id: 'teamcity',
          detail: 'Токен в профиле помечен как доступный, но заголовок Authorization пуст — проверьте сохранённые учётные данные.',
        }),
      )
    } else {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 10000)
      try {
        const t0 = Date.now()
        const res = await fetch(`${tcBase}/app/rest/version`, {
          method: 'GET',
          headers: { Authorization: auth, Accept: 'application/json,*/*' },
          signal: ac.signal,
        })
        const ms = Date.now() - t0
        const body = await res.text()
        const snippet = body.length > 120 ? `${body.slice(0, 120)}…` : body
        clearTimeout(timer)
        if (!res.ok) {
          checks.push(
            check('error', 'TeamCity', {
              id: 'teamcity',
              detail: `HTTP ${res.status} за ${ms} ms (запрос с токеном из профиля) · ${snippet}`,
            }),
          )
        } else {
          checks.push(
            check('ok', 'TeamCity', {
              id: 'teamcity',
              detail: `Ответ за ${ms} ms · ${tcBase} · токен из профиля · ${snippet.replace(/\s+/g, ' ').trim()}`,
            }),
          )
        }
      } catch (e) {
        clearTimeout(timer)
        checks.push(
          check('error', 'TeamCity', {
            id: 'teamcity',
            detail: e?.name === 'AbortError' ? 'Таймаут запроса к TeamCity' : e?.message || String(e),
          }),
        )
      }
    }
  }

  const overall =
    checks.some((c) => c.status === 'error') ? 'error' : checks.some((c) => c.status === 'warn') ? 'warn' : 'ok'

  return {
    meta: {
      app: pkg.name,
      version: pkg.version || null,
      node: process.version,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      uptimeSeconds: Math.floor(process.uptime()),
      buildSha: buildSha || null,
    },
    overall,
    checks,
  }
}
