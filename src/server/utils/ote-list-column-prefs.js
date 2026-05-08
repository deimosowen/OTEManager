import { createError } from 'h3'
import { and, eq } from 'drizzle-orm'
import {
  normalizeOteGroupedValueLayout,
  defaultOteGroupedValueLayoutForOteYc,
  normalizeOteYcColumnPrefItems,
  defaultOteYcColumnPrefItems,
  OTE_LIST_VIEW_ENV_YC,
  OTE_YC_LIST_REGISTRY,
} from '@app-constants/ote-list-columns.js'
import { getDb } from '../db/client.js'
import { oteUserListColumnPrefs } from '../db/schema.js'
import { integrationUserKey } from './integrations/user-credentials.js'

/** @typedef {{ login?: string, email?: string, id?: string }} OtePublicUserLike */

/**
 * @param {string | Record<string, unknown> | null | undefined} raw
 * @returns {{ items?: unknown[], groupedValueLayout?: unknown } | null}
 */
export function parseStoredOteListColumnPrefsObject(raw) {
  try {
    const j = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!j || typeof j !== 'object') return null
    return j
  } catch {
    return null
  }
}

/**
 * @param {{ login?: string, email?: string, id?: string } | null} user
 */
export async function getOteListColumnPrefsForUser(user, viewKey = OTE_LIST_VIEW_ENV_YC) {
  const key = integrationUserKey(user || {})
  if (!key || viewKey !== OTE_LIST_VIEW_ENV_YC) {
    return {
      registry: OTE_YC_LIST_REGISTRY,
      items: defaultOteYcColumnPrefItems(),
      groupedValueLayout: defaultOteGroupedValueLayoutForOteYc(),
    }
  }
  const db = getDb()
  const rows = await db
    .select({ prefsJson: oteUserListColumnPrefs.prefsJson })
    .from(oteUserListColumnPrefs)
    .where(and(eq(oteUserListColumnPrefs.userKey, key), eq(oteUserListColumnPrefs.viewKey, viewKey)))
    .limit(1)
  const stored = rows[0]?.prefsJson
  const obj = parseStoredOteListColumnPrefsObject(stored)
  const itemsRaw = Array.isArray(obj?.items) ? obj.items : null
  const items = normalizeOteYcColumnPrefItems(itemsRaw !== null ? itemsRaw : [])
  const groupedValueLayout = normalizeOteGroupedValueLayout(
    obj?.groupedValueLayout ?? defaultOteGroupedValueLayoutForOteYc(),
  )
  return { registry: OTE_YC_LIST_REGISTRY, items, groupedValueLayout }
}

/**
 * @param {OtePublicUserLike | null} user
 * @param {string} viewKey
 * @param {unknown} itemsRaw
 * @param {unknown} [groupedLayoutRaw] — если не передан, берётся из существующей записи в БД
 */
export async function upsertOteListColumnPrefsForUser(user, viewKey, itemsRaw, groupedLayoutRaw) {
  const key = integrationUserKey(user || {})
  if (!key) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя' })
  }
  if (viewKey !== OTE_LIST_VIEW_ENV_YC) {
    throw createError({ statusCode: 400, message: 'Неизвестный режим представления колонок' })
  }
  const items = normalizeOteYcColumnPrefItems(itemsRaw)
  if (!items.some((x) => x.visible)) {
    throw createError({ statusCode: 400, message: 'Нужно оставить хотя бы одну видимую колонку.' })
  }
  if (!items.find((x) => x.id === 'ote')?.visible) {
    throw createError({ statusCode: 400, message: 'Колонку «ОТЕ» нельзя отключить.' })
  }

  const db = getDb()
  const prevRows = await db
    .select({ prefsJson: oteUserListColumnPrefs.prefsJson })
    .from(oteUserListColumnPrefs)
    .where(and(eq(oteUserListColumnPrefs.userKey, key), eq(oteUserListColumnPrefs.viewKey, viewKey)))
    .limit(1)
  const prevObj = parseStoredOteListColumnPrefsObject(prevRows[0]?.prefsJson)
  const mergedLayout =
    groupedLayoutRaw !== undefined
      ? normalizeOteGroupedValueLayout(groupedLayoutRaw)
      : normalizeOteGroupedValueLayout(
          prevObj?.groupedValueLayout ?? defaultOteGroupedValueLayoutForOteYc(),
        )

  const payload = JSON.stringify({
    version: 2,
    items,
    groupedValueLayout: mergedLayout,
  })
  const now = new Date()

  await db
    .insert(oteUserListColumnPrefs)
    .values({
      userKey: key,
      viewKey,
      prefsJson: payload,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [oteUserListColumnPrefs.userKey, oteUserListColumnPrefs.viewKey],
      set: { prefsJson: payload, updatedAt: now },
    })

  return { registry: OTE_YC_LIST_REGISTRY, items, groupedValueLayout: mergedLayout }
}
