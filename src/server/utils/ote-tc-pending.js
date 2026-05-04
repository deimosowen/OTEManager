import { OTE_STATUS } from '@app-constants/ote.js'
import { fetchTeamCityBuildSnapshot } from './teamcity/client.js'
import { resolveTeamCityAuthorizationHeader } from './teamcity/resolve-auth.js'
import { mapYcInstanceStatusToOte } from './yc/compute.js'

/**
 * In-process: ожидание завершения операции TeamCity (старт / стоп / удаление по тегу) для конкретной OTE.
 * Снимается, когда:
 * - сборка в TeamCity перешла в терминальное состояние (в т.ч. отмена вручную), если TC настроен и известен buildId (опрос REST);
 * - если TC не настроен — по достижению целевого состояния ВМ в YC (редкий fallback);
 * - или истёк TTL;
 * - или вызван clearTcPending / API сброса.
 */

/** @type {Map<string, { action: 'start'|'stop'|'delete', queuedAt: string, buildId: string, expiresAt: number, tcAuthUserKey: string, tcRestBaseUrl: string }>} */
const pendingByOteId = new Map()

/** 25 мин — запас на длинные сборки/прогрев ВМ */
const DEFAULT_TTL_MS = 25 * 60 * 1000

function sweepExpired() {
  const now = Date.now()
  for (const [id, rec] of pendingByOteId) {
    if (rec.expiresAt <= now) pendingByOteId.delete(id)
  }
}

/**
 * @param {string} oteId
 * @returns {{ action: string, queuedAt: string, buildId?: string } | null}
 */
export function peekTcPending(oteId) {
  sweepExpired()
  const rec = pendingByOteId.get(oteId)
  if (!rec) return null
  return { action: rec.action, queuedAt: rec.queuedAt, buildId: rec.buildId || undefined }
}

/**
 * @param {string} oteId
 * @param {{ action: 'start'|'stop'|'delete', buildId?: string, tcAuthUserKey?: string, tcRestBaseUrl?: string }} rec
 */
export function markTcPending(oteId, rec) {
  const now = Date.now()
  pendingByOteId.set(oteId, {
    action: rec.action,
    queuedAt: new Date(now).toISOString(),
    buildId: rec.buildId ? String(rec.buildId) : '',
    expiresAt: now + DEFAULT_TTL_MS,
    tcAuthUserKey: rec.tcAuthUserKey ? String(rec.tcAuthUserKey).slice(0, 256) : '',
    tcRestBaseUrl: rec.tcRestBaseUrl ? String(rec.tcRestBaseUrl).trim().replace(/\/+$/, '').slice(0, 2048) : '',
  })
}

/**
 * Снять блокировку вручную (кнопка в UI или отмена сборки без id в ответе TC).
 * @param {string} oteId
 * @returns {boolean} было ли что-то удалено
 */
export function clearTcPending(oteId) {
  sweepExpired()
  return pendingByOteId.delete(oteId)
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 */
function countRunning(members) {
  if (!members?.length) return 0
  return members.filter((m) => mapYcInstanceStatusToOte(m.status) === OTE_STATUS.RUNNING).length
}

/**
 * Обновить блокировку: опрос TeamCity по buildId, затем сверка с YC.
 * @param {string} oteId
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {import('@nuxt/schema').NitroRuntimeConfig | undefined} config
 * @returns {Promise<{
 *   action: 'start'|'stop'|'delete',
 *   queuedAt: string,
 *   buildId?: string,
 *   progress: { running: number, total: number },
 * } | null>}
 */
export async function resolveTcPendingState(oteId, members, config) {
  sweepExpired()
  const rec = pendingByOteId.get(oteId)
  if (!rec) return null

  const authHeader =
    config && (await resolveTeamCityAuthorizationHeader(config, { userKey: rec.tcAuthUserKey || undefined }))

  const buildId = rec.buildId ? String(rec.buildId).trim() : ''
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
        pendingByOteId.delete(oteId)
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

  if (!members?.length) {
    if (!waitTeamCityFinish && rec.action === 'delete') {
      pendingByOteId.delete(oteId)
      return null
    }
    return {
      action: rec.action,
      queuedAt: rec.queuedAt,
      buildId: rec.buildId || undefined,
      progress: { running: 0, total: 0 },
    }
  }
  const total = members.length
  const running = countRunning(members)
  if (!waitTeamCityFinish) {
    if (rec.action === 'start' && running === total) {
      pendingByOteId.delete(oteId)
      return null
    }
    if (rec.action === 'stop' && running === 0) {
      pendingByOteId.delete(oteId)
      return null
    }
  }
  return {
    action: rec.action,
    queuedAt: rec.queuedAt,
    buildId: rec.buildId || undefined,
    progress: { running, total },
  }
}
