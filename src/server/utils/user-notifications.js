import { getDb } from '../db/client.js'
import { userNotifications } from '../db/schema.js'
import { APP_NOTIFICATION_KIND } from '@app-constants/notifications.js'
import { integrationUserKey } from './integrations/user-credentials.js'
import { isOteTcUpdatePreset } from './ote-tc-job-audit.js'
import { publishUserNotificationJson } from './notification-sse-bus.js'
import { mapUserNotificationRow } from './user-notification-map.js'

const MAX_BODY = 1900
const MAX_TITLE = 512
const MAX_HREF = 1024

function recipientKeyFromCreationRow(row) {
  return integrationUserKey({
    login: row.actorLogin || '',
    email: row.actorEmail || '',
    id: '',
  })
}

function clipBody(s) {
  const t = String(s || '').trim()
  if (!t) return null
  return t.length > MAX_BODY ? `${t.slice(0, MAX_BODY)}…` : t
}

function clipTitle(s) {
  const t = String(s || '').trim()
  if (!t) return null
  return t.length > MAX_TITLE ? `${t.slice(0, MAX_TITLE)}…` : t
}

/** @param {unknown} href */
function normalizeAutomationHref(href) {
  const raw = String(href ?? '').trim()
  if (!raw) return '/'
  const clipped = raw.length > MAX_HREF ? raw.slice(0, MAX_HREF) : raw
  if (/^https?:\/\//i.test(clipped)) return clipped
  return clipped.startsWith('/') ? clipped : `/${clipped}`
}

/**
 * Одно уведомление на пару (пользователь, запрос создания, исход) — дубликаты игнорируются.
 * @param {{ actorLogin: string, actorEmail: string, id: number }} row
 * @param {'succeeded'|'failed'} outcome
 * @param {string} [detail] кратко для body при ошибке
 */
export async function notifyOteTcCreationFinished(row, outcome, detail = '') {
  const userKey = recipientKeyFromCreationRow(row)
  if (!userKey) return
  const id = typeof row.id === 'number' ? row.id : Number(row.id)
  if (!Number.isFinite(id)) return

  const succeeded = outcome === 'succeeded'
  const upd = isOteTcUpdatePreset(row.presetId)
  const kind = succeeded
    ? upd
      ? APP_NOTIFICATION_KIND.OTE_UPDATE_SUCCEEDED
      : APP_NOTIFICATION_KIND.OTE_CREATE_SUCCEEDED
    : upd
      ? APP_NOTIFICATION_KIND.OTE_UPDATE_FAILED
      : APP_NOTIFICATION_KIND.OTE_CREATE_FAILED
  const href = `/create/requests/${id}`
  const tag = row.metadataTag && String(row.metadataTag).trim()
  const title = succeeded
    ? upd
      ? 'OTE успешно обновлена'
      : 'OTE успешно создана'
    : upd
      ? 'Обновление OTE завершилось с ошибкой'
      : 'Создание OTE завершилось с ошибкой'

  let body = ''
  if (succeeded) {
    const parts = []
    if (tag) parts.push(`Метка: ${tag}`)
    if (row.caseoneVersion && String(row.caseoneVersion).trim()) parts.push(`Версия: ${String(row.caseoneVersion).trim()}`)
    body =
      parts.join(' · ') ||
      (upd ? 'Сборка обновления прошла успешно.' : 'Сборка TeamCity прошла успешно. Откройте запрос для логов и ссылок.')
  } else {
    body = clipBody(detail || row.lastError) || 'Сборка завершилась неуспешно. Подробности в логе TeamCity.'
  }

  const db = getDb()
  const now = new Date()
  try {
    const inserted = await db
      .insert(userNotifications)
      .values({
        createdAt: now,
        readAt: null,
        userKey,
        kind,
        title,
        body: body || null,
        href,
        tcCreationId: id,
      })
      .returning()

    const row = inserted && inserted[0]
    if (row) publishUserNotificationJson(userKey, { type: 'notification', notification: mapUserNotificationRow(row) })
  } catch (e) {
    const msg = e?.message || String(e)
    if (msg.includes('UNIQUE constraint') || msg.includes('unique constraint')) return
    throw e
  }
}

/**
 * Уведомление из сценария автоматизации (колокольчик). Несколько сообщений подряд разрешены.
 * @param {string} userKey
 * @param {{ title?: string, body?: string, href?: string }} payload
 * @returns {Promise<ReturnType<typeof mapUserNotificationRow> | null>}
 */
export async function insertAutomationBellNotification(userKey, payload) {
  const title = clipTitle(payload?.title)
  if (!title) return null
  const db = getDb()
  const now = new Date()
  const inserted = await db
    .insert(userNotifications)
    .values({
      createdAt: now,
      readAt: null,
      userKey,
      kind: APP_NOTIFICATION_KIND.AUTOMATION_BELL,
      title,
      body: clipBody(payload?.body),
      href: normalizeAutomationHref(payload?.href),
      tcCreationId: null,
    })
    .returning()

  const row = inserted && inserted[0]
  if (!row) return null
  const mapped = mapUserNotificationRow(row)
  publishUserNotificationJson(userKey, { type: 'notification', notification: mapped })
  return mapped
}
