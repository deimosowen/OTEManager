import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'
import { seedIntegrationDatabase } from './seed-database.mjs'
import { signIntegrationSessionCookie } from './sign-session-cookie.mjs'
import { startTeamCityHttpMock, INTEGRATION_TC_BUILD_ID } from './teamcity-http-mock.mjs'
import { OTE_SESSION_COOKIE } from '~/server/utils/ote-session.js'

/** Совпадает с секретом в CI workflow для production build */
const SESSION_SECRET = 'ci-build-placeholder-secret-min-32-chars-xx'

const rootDir = fileURLToPath(new URL('../..', import.meta.url))

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      s.close(() => resolve(port))
    })
  })
}

async function waitForOk(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs
  /** @type {unknown} */
  let lastErr = null
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url)
      if (r.ok) return
      lastErr = r.status
    } catch (e) {
      lastErr = e
    }
    await new Promise((r) => setTimeout(r, 120))
  }
  throw new Error(`Timeout waiting for ${url}: ${String(lastErr)}`)
}

describe('Nitro API (интеграция)', () => {
  /** @type {{ close: () => Promise<void> } | undefined} */
  let tcMock
  /** @type {import('node:child_process').ChildProcess | undefined} */
  let proc
  /** @type {string} */
  let baseUrl
  /** @type {{ buildTemplateId: number, userKey: string, dbFilePath: string }} */
  let meta
  /** @type {string} */
  let sessionCookieHeader

  beforeAll(async () => {
    const tcPort = await getFreePort()
    tcMock = await startTeamCityHttpMock(tcPort)
    const teamcityBaseUrl = `http://127.0.0.1:${tcPort}`

    const dbPath = path.join(rootDir, 'tests/integration/.tmp/integration.sqlite')
    meta = await seedIntegrationDatabase(dbPath, SESSION_SECRET, { teamcityBaseUrl })

    const port = await getFreePort()
    baseUrl = `http://127.0.0.1:${port}`

    proc = spawn(process.execPath, [path.join(rootDir, '.output/server/index.mjs')], {
      cwd: rootDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(port),
        NITRO_PORT: String(port),
        HOST: '127.0.0.1',
        NUXT_SESSION_SECRET: SESSION_SECRET,
        NUXT_PUBLIC_SITE_URL: baseUrl,
        NUXT_SQLITE_PATH: meta.dbFilePath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const token = signIntegrationSessionCookie(
      {
        sub: 'yandex-integration-sub',
        login: meta.userKey,
        email: 'integration@test.invalid',
        name: 'Integration Test',
      },
      SESSION_SECRET,
    )
    sessionCookieHeader = `${OTE_SESSION_COOKIE}=${encodeURIComponent(token)}`

    await waitForOk(`${baseUrl}/api/auth/session`)
  }, 120000)

  afterAll(async () => {
    if (proc && typeof proc.pid === 'number' && !proc.killed) {
      proc.kill('SIGTERM')
    }
    if (tcMock?.close) {
      await tcMock.close()
    }
  })

  it('POST /api/ote/create/teamcity без cookie → 401', async () => {
    const r = await fetch(`${baseUrl}/api/ote/create/teamcity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildTemplateId: meta.buildTemplateId }),
    })
    expect(r.status).toBe(401)
  })

  it('POST /api/ote/create/teamcity с сессией создаёт запись (локальный HTTP-мок TeamCity)', async () => {
    const r = await fetch(`${baseUrl}/api/ote/create/teamcity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookieHeader,
      },
      body: JSON.stringify({
        buildTemplateId: meta.buildTemplateId,
        overrides: { 'metadata.tag': 'mt-integration-1' },
      }),
    })
    expect(r.status).toBe(200)
    const json = await r.json()
    expect(json.creation?.teamcityBuildId).toBe(INTEGRATION_TC_BUILD_ID)
    expect(json.creation?.id).toBeTruthy()
    expect(json.creation?.status).toBe('queued')
  })

  it('GET /api/admin/users с админской сессией → список пользователей', async () => {
    const r = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: sessionCookieHeader },
    })
    expect(r.status).toBe(200)
    const json = await r.json()
    expect(Array.isArray(json.users)).toBe(true)
    expect(json.users.length).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(json.roles)).toBe(true)
    expect(Array.isArray(json.groups)).toBe(true)
  })
})
