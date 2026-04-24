import { and, count, desc, eq, gte, like, lte, or } from 'drizzle-orm'
import { AUDIT_ACTION, AUDIT_LIST_PAGE_SIZE } from '@app-constants/audit.js'
import { getDb } from '../db/client.js'
import { auditEvents } from '../db/schema.js'

const ALLOWED_ACTION_CODES = new Set(Object.values(AUDIT_ACTION))

/**
 * Запись в журнал аудита. Не бросает наружу — логирует ошибку в консоль.
 * @param {{
 *   actorLogin: string,
 *   actorEmail: string,
 *   actionCode: string,
 *   oteResourceId?: string | null,
 *   oteTag?: string | null,
 *   details?: Record<string, unknown> | null,
 *   occurredAt?: Date,
 * }} payload
 */
export async function recordAuditEvent(payload) {
  const {
    actorLogin = '',
    actorEmail = '',
    actionCode,
    oteResourceId = null,
    oteTag = null,
    details = null,
    occurredAt = new Date(),
  } = payload
  if (!actionCode) return
  try {
    const db = getDb()
    await db.insert(auditEvents).values({
      occurredAt,
      actionCode: String(actionCode).slice(0, 128),
      actorLogin: String(actorLogin).slice(0, 256),
      actorEmail: String(actorEmail).slice(0, 512),
      oteResourceId: oteResourceId != null && String(oteResourceId).trim() ? String(oteResourceId).slice(0, 512) : null,
      oteTag: oteTag != null && String(oteTag).trim() ? String(oteTag).slice(0, 512) : null,
      detailsJson: details && typeof details === 'object' ? JSON.stringify(details) : null,
    })
  } catch (e) {
    console.error('[audit] recordAuditEvent', e)
  }
}

/**
 * @param {{ login?: string, email?: string }} user
 * @param {Omit<Parameters<typeof recordAuditEvent>[0], 'actorLogin' | 'actorEmail'>} partial
 */
export function auditPayloadFromUser(user, partial) {
  return {
    actorLogin: user?.login || '',
    actorEmail: user?.email || '',
    ...partial,
  }
}

/**
 * @param {unknown} v
 */
function toIsoUtc(v) {
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'number') return new Date(v).toISOString()
  return new Date().toISOString()
}

/**
 * @param {typeof auditEvents.$inferSelect} row
 */
function mapAuditRow(row) {
  let details = null
  if (row.detailsJson) {
    try {
      details = JSON.parse(row.detailsJson)
    } catch {
      details = null
    }
  }
  return {
    id: row.id,
    occurredAt: toIsoUtc(row.occurredAt),
    actionCode: row.actionCode,
    actorLogin: row.actorLogin,
    actorEmail: row.actorEmail,
    oteResourceId: row.oteResourceId || null,
    oteTag: row.oteTag || null,
    details,
  }
}

/**
 * @param {Record<string, unknown>} q
 * @param {string} key
 */
function qs(q, key) {
  const v = q[key]
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : ''
  return typeof v === 'string' ? v : ''
}

/** Убираем символы шаблона LIKE — в используемой версии drizzle `like` без ESCAPE. */
function stripLikeWildcards(s) {
  return String(s).replace(/[%_\\]/g, '').trim()
}

/**
 * @param {string} yyyyMmDd
 * @returns {number | null} UTC ms начала календарного дня
 */
function utcDayStartMs(yyyyMmDd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(yyyyMmDd).trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
  return Date.UTC(y, mo, d)
}

/**
 * @param {string} yyyyMmDd
 * @returns {number | null} UTC ms конца календарного дня (23:59:59.999)
 */
function utcDayEndMs(yyyyMmDd) {
  const start = utcDayStartMs(yyyyMmDd)
  if (start == null) return null
  return start + 24 * 60 * 60 * 1000 - 1
}

/**
 * Разбор query для списка аудита (общий и по OTE).
 * @param {Record<string, unknown>} q — результат getQuery
 * @param {{
 *   lockedOteResourceId?: string,
 *   lockedOteTag?: string,
 * }} ctx — при `lockedOteResourceId` фильтр по id карточки; опционально `lockedOteTag` или query `oteTag` — OR по `ote_tag` (события создания с `tc-creation:…`).
 */
export function parseAuditListQuery(q, ctx = {}) {
  const locked = ctx.lockedOteResourceId != null && String(ctx.lockedOteResourceId).trim()
    ? String(ctx.lockedOteResourceId).trim().slice(0, 512)
    : ''

  const tagFromCtx = ctx.lockedOteTag != null && String(ctx.lockedOteTag).trim() ? String(ctx.lockedOteTag).trim() : ''
  const tagFromQuery = qs(q, 'oteTag').trim()
  const lockedOteTag = (tagFromCtx || tagFromQuery).slice(0, 512) || null

  const pageSize =
    ctx.fixedPageSize != null
      ? Math.min(100, Math.max(1, Math.floor(Number(ctx.fixedPageSize))))
      : AUDIT_LIST_PAGE_SIZE

  const pageRaw = Number(qs(q, 'page')) || 1
  const page = Math.max(1, Math.floor(pageRaw))
  const offset = (page - 1) * pageSize

  const actionRaw = qs(q, 'actionCode').trim().slice(0, 128)
  const actionCode = actionRaw && ALLOWED_ACTION_CODES.has(actionRaw) ? actionRaw : null

  const search = qs(q, 'search').trim().slice(0, 512)

  const dateFrom = qs(q, 'dateFrom').trim().slice(0, 10)
  const dateTo = qs(q, 'dateTo').trim().slice(0, 10)

  return {
    page,
    pageSize,
    offset,
    actionCode,
    search,
    lockedOteResourceId: locked || null,
    lockedOteTag,
    dateFrom,
    dateTo,
  }
}

/**
 * @param {ReturnType<typeof parseAuditListQuery>} p
 */
function buildAuditWhere(p) {
  const conditions = []

  if (p.lockedOteResourceId && p.lockedOteTag) {
    conditions.push(
      or(eq(auditEvents.oteResourceId, p.lockedOteResourceId), eq(auditEvents.oteTag, p.lockedOteTag)),
    )
  } else if (p.lockedOteResourceId) {
    conditions.push(eq(auditEvents.oteResourceId, p.lockedOteResourceId))
  }

  if (p.actionCode) {
    conditions.push(eq(auditEvents.actionCode, p.actionCode))
  }

  const safeSearch = stripLikeWildcards(p.search)
  if (safeSearch) {
    const pattern = `%${safeSearch}%`
    const parts = [
      like(auditEvents.actorLogin, pattern),
      like(auditEvents.actorEmail, pattern),
      like(auditEvents.oteTag, pattern),
    ]
    if (!p.lockedOteResourceId || p.lockedOteTag) {
      parts.push(like(auditEvents.oteResourceId, pattern))
    }
    conditions.push(or(...parts))
  }

  const fromMs = p.dateFrom ? utcDayStartMs(p.dateFrom) : null
  if (fromMs != null) {
    conditions.push(gte(auditEvents.occurredAt, new Date(fromMs)))
  }
  const toMs = p.dateTo ? utcDayEndMs(p.dateTo) : null
  if (toMs != null) {
    conditions.push(lte(auditEvents.occurredAt, new Date(toMs)))
  }

  if (!conditions.length) return undefined
  return and(...conditions)
}

/**
 * Список с серверной пагинацией и фильтрами.
 * @param {ReturnType<typeof parseAuditListQuery>} parsed
 * @returns {Promise<{ items: ReturnType<typeof mapAuditRow>[], total: number, page: number, pageSize: number }>}
 */
export async function queryAuditEvents(parsed) {
  const db = getDb()
  const where = buildAuditWhere(parsed)

  const countBase = db.select({ n: count() }).from(auditEvents)
  const countRows = where ? await countBase.where(where) : await countBase
  const total = Number(countRows[0]?.n ?? 0)

  const selBase = db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
    .limit(parsed.pageSize)
    .offset(parsed.offset)

  const rows = where ? await selBase.where(where) : await selBase

  return {
    items: rows.map(mapAuditRow),
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

/**
 * @deprecated Используйте queryAuditEvents + parseAuditListQuery
 * @param {{ limit?: number, oteResourceId?: string | null }} opts
 */
export async function listAuditEvents(opts = {}) {
  const limit = Math.min(Math.max(1, Number(opts.limit) || 200), 500)
  const oteId = opts.oteResourceId != null && String(opts.oteResourceId).trim() ? String(opts.oteResourceId) : null
  const parsed = parseAuditListQuery({ page: '1' }, oteId ? { lockedOteResourceId: oteId, fixedPageSize: limit } : { fixedPageSize: limit })
  const { items } = await queryAuditEvents(parsed)
  return items
}
