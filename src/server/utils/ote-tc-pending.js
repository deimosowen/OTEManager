import { eq, lte } from 'drizzle-orm'
import { OTE_STATUS } from '@app-constants/ote.js'
import { getDb } from '../db/client.js'
import { oteTcOperationPending } from '../db/schema.js'
import { fetchTeamCityBuildSnapshot } from './teamcity/client.js'
import { resolveTeamCityAuthorizationHeader } from './teamcity/resolve-auth.js'
import { mapYcInstanceStatusToOte } from './yc/compute.js'

/**
 * Блокировка параллельных операций TeamCity по одной OTE хранится в SQLite (`ote_tc_operation_pending`).
 * Снимается, когда сборка TC в терминальном состоянии (если известны buildId + URL + авторизация),
 * или по TTL, или через clearTcPending / API сброса, или по fallback по YC (если TC не используется).
 *
 * Если у реплик разные файлы БД, гонки между процессами остаются — нужен общий LibSQL URL / координатор (Redis и т.п.).
 */

/** 25 мин — запас на длинные сборки/прогрев ВМ */
const DEFAULT_TTL_MS = 25 * 60 * 1000

/**
 * @param {import('drizzle-orm').LibSQLDatabase<typeof import('../db/schema.js')>} db
 */
async function sweepExpired(db) {
  const now = new Date()
  await db.delete(oteTcOperationPending).where(lte(oteTcOperationPending.expiresAt, now))
}

/** @param {typeof oteTcOperationPending.$inferSelect} row */
function rowToPeek(row) {
  const q = row.queuedAt
  const queuedAt =
    q instanceof Date
      ? q.toISOString()
      : typeof q === 'number'
        ? new Date(q).toISOString()
        : new Date(Number(q)).toISOString()
  const bid = row.teamcityBuildId ? String(row.teamcityBuildId).trim() : ''
  return { action: row.action, queuedAt, buildId: bid || undefined }
}

/**
 * @param {string} oteId
 * @returns {Promise<{ action: string, queuedAt: string, buildId?: string } | null>}
 */
export async function peekTcPending(oteId) {
  const db = getDb()
  await sweepExpired(db)
  const rows = await db
    .select()
    .from(oteTcOperationPending)
    .where(eq(oteTcOperationPending.oteResourceId, oteId))
    .limit(1)
  if (!rows.length) return null
  return rowToPeek(rows[0])
}

/**
 * Атомарно занять строку до вызова TeamCity (`INSERT … ON CONFLICT DO NOTHING`).
 * @param {string} oteId
 * @param {{ action: 'start'|'stop'|'delete'|'modify_delete_date', tcAuthUserKey?: string, tcRestBaseUrl?: string }} rec
 * @returns {Promise<boolean>}
 */
export async function reserveTcPendingSlot(oteId, rec) {
  const db = getDb()
  await sweepExpired(db)
  const now = Date.now()
  const inserted = await db
    .insert(oteTcOperationPending)
    .values({
      oteResourceId: oteId,
      action: rec.action,
      queuedAt: new Date(now),
      expiresAt: new Date(now + DEFAULT_TTL_MS),
      teamcityBuildId: null,
      tcAuthUserKey: rec.tcAuthUserKey ? String(rec.tcAuthUserKey).slice(0, 256) : '',
      tcRestBaseUrl: rec.tcRestBaseUrl ? String(rec.tcRestBaseUrl).trim().replace(/\/+$/, '').slice(0, 2048) : '',
    })
    .onConflictDoNothing()
    .returning({ k: oteTcOperationPending.oteResourceId })
  return inserted.length > 0
}

/**
 * После успешной постановки сборки в очередь TC.
 * @param {string} oteId
 * @param {{ buildId?: string }} rec
 */
export async function updateTcPendingBuildId(oteId, rec) {
  const db = getDb()
  const bid = rec.buildId != null ? String(rec.buildId).trim() : ''
  await db
    .update(oteTcOperationPending)
    .set({ teamcityBuildId: bid || null })
    .where(eq(oteTcOperationPending.oteResourceId, oteId))
}

/**
 * Снять блокировку вручную (кнопка в UI или отмена сборки без id в ответе TC).
 * @param {string} oteId
 * @returns {Promise<boolean>} было ли что-то удалено
 */
export async function clearTcPending(oteId) {
  const db = getDb()
  await sweepExpired(db)
  const res = await db
    .delete(oteTcOperationPending)
    .where(eq(oteTcOperationPending.oteResourceId, oteId))
    .returning({ k: oteTcOperationPending.oteResourceId })
  return res.length > 0
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 */
function countRunning(members) {
  if (!members?.length) return 0
  return members.filter((m) => mapYcInstanceStatusToOte(m.status) === OTE_STATUS.RUNNING).length
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase<typeof import('../db/schema.js')>} db
 * @param {string} oteId
 */
async function deletePending(db, oteId) {
  await db.delete(oteTcOperationPending).where(eq(oteTcOperationPending.oteResourceId, oteId))
}

/**
 * Обновить блокировку: опрос TeamCity по buildId, затем сверка с YC.
 * @param {string} oteId
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {import('@nuxt/schema').NitroRuntimeConfig | undefined} config
 * @returns {Promise<{
 *   action: 'start'|'stop'|'delete'|'modify_delete_date',
 *   queuedAt: string,
 *   buildId?: string,
 *   progress: { running: number, total: number },
 * } | null>}
 */
export async function resolveTcPendingState(oteId, members, config) {
  const db = getDb()
  await sweepExpired(db)
  const rows = await db
    .select()
    .from(oteTcOperationPending)
    .where(eq(oteTcOperationPending.oteResourceId, oteId))
    .limit(1)
  if (!rows.length) return null
  const rec = rows[0]

  const authHeader =
    config && (await resolveTeamCityAuthorizationHeader(config, { userKey: rec.tcAuthUserKey || undefined }))

  const buildId = rec.teamcityBuildId ? String(rec.teamcityBuildId).trim() : ''
  const tcBase = rec.tcRestBaseUrl ? String(rec.tcRestBaseUrl).trim().replace(/\/+$/, '') : ''
  if (buildId && authHeader && tcBase) {
    try {
      const snap = await fetchTeamCityBuildSnapshot({
        config,
        buildId,
        authorization: authHeader,
        baseUrl: tcBase,
      })
      if (snap?.terminal) {
        await deletePending(db, oteId)
        return null
      }
    } catch {
      /* сеть / TC — не снимаем блокировку */
    }
  }

  /**
   * Pending выставляется только после успешного вызова TeamCity. Пока есть способ опросить TC — не снимаем
   * блокировку по YC: иначе при пустом buildId в ответе очереди сработает только выключение ВМ, пока сборка ещё идёт.
   */
  const waitTeamCityFinish = Boolean(authHeader && tcBase)

  const queuedAt =
    rec.queuedAt instanceof Date ? rec.queuedAt.toISOString() : new Date(Number(rec.queuedAt)).toISOString()
  const buildIdOut = rec.teamcityBuildId ? String(rec.teamcityBuildId).trim() : ''

  if (!members?.length) {
    if (!waitTeamCityFinish && rec.action === 'delete') {
      await deletePending(db, oteId)
      return null
    }
    return {
      action: rec.action,
      queuedAt,
      buildId: buildIdOut || undefined,
      progress: { running: 0, total: 0 },
    }
  }
  const total = members.length
  const running = countRunning(members)
  if (!waitTeamCityFinish) {
    if (rec.action === 'start' && running === total) {
      await deletePending(db, oteId)
      return null
    }
    if (rec.action === 'stop' && running === 0) {
      await deletePending(db, oteId)
      return null
    }
  }
  return {
    action: rec.action,
    queuedAt,
    buildId: buildIdOut || undefined,
    progress: { running, total },
  }
}
