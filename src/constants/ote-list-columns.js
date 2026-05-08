/**
 * Колонки списка OTE (режим каталога YC).
 * Базовые колонки: часть включаются по умолчанию см. `OTE_YC_DEFAULT_VISIBLE_IDS`.
 * Метки YC (`ycLbl_*`) по умолчанию скрыты.
 */

export const OTE_LIST_VIEW_ENV_YC = 'env_yc'

/** Префикс идентификаторов колонок из меток YC. */
export const OTE_YC_LABEL_COLUMN_ID_PREFIX = 'ycLbl_'

/** Как показывать несколько значений в одном поле строки OTE (несколько ВМ). */
export const OTE_YC_GROUPED_VALUE_JOIN_SLASH = 'join_slash'
export const OTE_YC_GROUPED_VALUE_MULTI_LINE = 'multi_line'

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   category: 'data' | 'system',
 *   labelKey?: string,
 * }} OteListColumnDef
 */

/** @type {OteListColumnDef[]} */
export const OTE_YC_CORE_COLUMNS = [
  { id: 'ote', label: 'ОТЕ', category: 'data' },
  { id: 'author', label: 'Автор', category: 'data' },
  { id: 'deleteDate', label: 'Удаление', category: 'data' },
  { id: 'status', label: 'Статус', category: 'data' },
  { id: 'versions', label: 'Версии (бек / фронт)', category: 'data' },
  { id: 'resourcesCpu', label: 'vCPU', category: 'data' },
  { id: 'resourcesRam', label: 'RAM, ГБ', category: 'data' },
  { id: 'app', label: 'Приложение', category: 'system' },
  { id: 'actions', label: 'Действия', category: 'system' },
  { id: 'card', label: 'Карточка', category: 'system' },
]

/**
 * Выбранные метки каталога Yandex Cloud.
 * @type {OteListColumnDef[]}
 */
export const OTE_YC_LABEL_EXTRA_COLUMNS = [
  { id: 'ycLbl_branchName', label: 'Ветка', labelKey: 'branch-name', category: 'data' },
  { id: 'ycLbl_osType', label: 'Тип ОС', labelKey: 'os-type', category: 'data' },
]

/** @type {OteListColumnDef[]} */
export const OTE_YC_LIST_REGISTRY = [...OTE_YC_CORE_COLUMNS, ...OTE_YC_LABEL_EXTRA_COLUMNS]

export const OTE_YC_COLUMN_IDS = OTE_YC_LIST_REGISTRY.map((c) => c.id)

export const OTE_YC_REQUIRED_COLUMN_ID = 'ote'

/** Порядок колонок в UI и модалке. */
export const OTE_YC_DEFAULT_COLUMN_ORDER = [...OTE_YC_COLUMN_IDS]

/**
 * Видимы по умолчанию без сохранённых префов (vCPU/RAM выключены, метки YC выключены).
 * @type {Set<string>}
 */
export const OTE_YC_DEFAULT_VISIBLE_IDS = new Set([
  'ote',
  'author',
  'deleteDate',
  'status',
  'versions',
  'app',
  'actions',
  'card',
])

/** @typedef {{ id: string, visible: boolean }} OteListColumnPrefItem */

export function defaultOteGroupedValueLayoutForOteYc() {
  return OTE_YC_GROUPED_VALUE_JOIN_SLASH
}

/** @param {unknown} raw */
export function normalizeOteGroupedValueLayout(raw) {
  if (raw === OTE_YC_GROUPED_VALUE_MULTI_LINE) return OTE_YC_GROUPED_VALUE_MULTI_LINE
  return OTE_YC_GROUPED_VALUE_JOIN_SLASH
}

/**
 * @returns {OteListColumnPrefItem[]}
 */
export function defaultOteYcColumnPrefItems() {
  return OTE_YC_DEFAULT_COLUMN_ORDER.map((id) => ({
    id,
    visible: OTE_YC_DEFAULT_VISIBLE_IDS.has(id),
  }))
}

/** @returns {Map<string, OteListColumnDef>} */
export function oteYcRegistryMap() {
  return new Map(OTE_YC_LIST_REGISTRY.map((c) => [c.id, c]))
}

/**
 * Нормализует сохранённые колонки: известные id, один раз каждый,
 * порядок из сохранённого списка, в конце — недостающие id из реестра по порядку по умолчанию.
 * @param {unknown} raw
 * @returns {OteListColumnPrefItem[]}
 */
export function normalizeOteYcColumnPrefItems(raw) {
  const reg = oteYcRegistryMap()
  /** @type {Map<string, boolean>} */
  const vis = new Map()
  /** Порядок колонок: как в сохранении, без дубликатов. */
  /** @type {string[]} */
  const orderPreferred = []
  /** @type {Set<string>} */
  const ordered = new Set()
  const arr = Array.isArray(raw) ? raw : []
  for (const row of arr) {
    const id = row && typeof row === 'object' && typeof row.id === 'string' ? row.id.trim() : ''
    if (!reg.has(id)) continue
    if (!vis.has(id)) {
      vis.set(id, Boolean(row.visible))
    }
    if (!ordered.has(id)) {
      ordered.add(id)
      orderPreferred.push(id)
    }
  }
  for (const id of OTE_YC_DEFAULT_COLUMN_ORDER) {
    if (!ordered.has(id)) {
      ordered.add(id)
      orderPreferred.push(id)
    }
  }
  const out = /** @type {OteListColumnPrefItem[]} */ ([])
  for (const id of orderPreferred) {
    let v = vis.has(id) ? vis.get(id) : OTE_YC_DEFAULT_VISIBLE_IDS.has(id)
    if (id === OTE_YC_REQUIRED_COLUMN_ID) v = true
    out.push({ id, visible: v })
  }
  if (!out.some((x) => x.visible)) {
    const ote = out.find((x) => x.id === OTE_YC_REQUIRED_COLUMN_ID)
    if (ote) ote.visible = true
    else out[0].visible = true
  }
  return out
}
