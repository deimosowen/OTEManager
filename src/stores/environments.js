import { defineStore } from 'pinia'
import { $fetch } from 'ofetch'
import { OTE_STATUS } from '~/constants/ote'
import { createSeedEnvironments } from '~/mocks/seedEnvironments'

function newId(list) {
  const nums = list.map((e) => Number(e.id)).filter((n) => !Number.isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return String(max + 1)
}

/** Поля карточки, которых нет в «лёгком» ответе списка — не затирать при refresh списка. */
const OTE_DETAIL_PRESERVE_KEYS = /** @type {const} */ ([
  'vmBuildLogRows',
  'tcConfigText',
  'ycLabelSections',
  'tcOperationPending',
  'oteTcCreationBlocking',
])

function hasVmBuildRows(val) {
  return Array.isArray(val) && val.length > 0
}

/**
 * Сохранить деталь карточки, если в `incoming` нет полноценной замены (ответ индекса после `loadDetail`).
 * @param {Record<string, unknown> | null | undefined} prev
 * @param {Record<string, unknown>} incoming
 */
function mergeOteClientRow(prev, incoming) {
  if (!prev) return incoming
  const out = { ...incoming }
  for (const k of OTE_DETAIL_PRESERVE_KEYS) {
    const nextVal = out[k]
    const prevVal = prev[k]
    if (k === 'vmBuildLogRows') {
      if (!hasVmBuildRows(nextVal) && hasVmBuildRows(prevVal)) out[k] = prevVal
    } else if (k === 'tcConfigText') {
      const nextStr = typeof nextVal === 'string' ? nextVal.trim() : ''
      const prevStr = typeof prevVal === 'string' ? prevVal.trim() : ''
      if (!nextStr && prevStr) out[k] = prevVal
    } else if (k === 'ycLabelSections') {
      if (!Array.isArray(nextVal) || !nextVal.length) {
        if (Array.isArray(prevVal) && prevVal.length) out[k] = prevVal
      }
    } else if (k === 'tcOperationPending' || k === 'oteTcCreationBlocking') {
      if (!Object.prototype.hasOwnProperty.call(incoming, k) && prevVal != null) out[k] = prevVal
    }
  }
  if (!Object.prototype.hasOwnProperty.call(incoming, 'oteTcCreationSummary') && prev.oteTcCreationSummary != null) {
    out.oteTcCreationSummary = prev.oteTcCreationSummary
  }
  for (const k of ['oteTcUpdateViaManagerAvailable', 'oteTcUpdateResolvedBuildTemplateId']) {
    if (!Object.prototype.hasOwnProperty.call(incoming, k) && Object.prototype.hasOwnProperty.call(prev, k)) {
      out[k] = prev[k]
    }
  }
  return out
}

export const useEnvironmentsStore = defineStore('environments', {
  state: () => ({
    /**
     * `pending` — первая загрузка;
     * `yc` — список из облака (каталог задан);
     * `no_folder` — для группы не указан каталог, список пустой;
     * `error` — сбой загрузки;
     * `seed` — только для тестов / явного вызова `useSeedList()`.
     */
    listSource: 'pending',
    /** Таблица в стиле TeamCity из `/api/ote/instances` (только при `listSource === 'yc'`). */
    tcTable: null,
    lastListError: '',
    items: [],
    filters: {
      query: '',
      product: '',
      status: '',
      type: '',
      onlyMine: false,
    },
  }),
  getters: {
    productOptions: (s) => {
      const set = new Set(s.items.map((i) => i.product).filter(Boolean))
      return ['', ...Array.from(set).sort()]
    },
    typeOptions: (s) => {
      const set = new Set(s.items.map((i) => i.type).filter(Boolean))
      return ['', ...Array.from(set).sort()]
    },
    filteredItems(s) {
      const q = s.filters.query.trim().toLowerCase()
      return s.items.filter((row) => {
        if (q) {
          const linkBlob =
            Array.isArray(row.appLinks) && row.appLinks.length
              ? row.appLinks.map((l) => [l.label, l.href].filter(Boolean).join(' ')).join(' ')
              : ''
          const blob = [
            row.name,
            row.oteName,
            row.runBy,
            row.deleteDate,
            row.versionBackend,
            row.versionFrontend,
            row.appUrl,
            row.protected ? 'protected защита' : '',
            linkBlob,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          if (!blob.includes(q)) return false
        }
        if (s.filters.product && row.product !== s.filters.product) return false
        if (s.filters.status && row.status !== s.filters.status) return false
        if (s.filters.type && row.type !== s.filters.type) return false
        if (s.filters.onlyMine && !row.mine) return false
        return true
      })
    },
    byId: (s) => (id) => s.items.find((e) => e.id === id) || null,
  },
  actions: {
    /**
     * Подменить список из API (после детального запроса и т.п.).
     * @param {Record<string, unknown>} item
     */
    upsertItem(item) {
      const id = String(item.id || '')
      if (!id) return
      const idx = this.items.findIndex((e) => e.id === id)
      if (idx >= 0) this.items[idx] = mergeOteClientRow(this.items[idx], item)
      else this.items.unshift(item)
    },
    /** Вернуть демо-данные (локальная разработка без YC). */
    useSeedList() {
      this.items = createSeedEnvironments()
      this.listSource = 'seed'
      this.tcTable = null
      this.lastListError = ''
    },
    /**
     * Загрузить список OTE из Yandex Compute. При ошибке оставляет текущие строки и пишет `lastListError`.
     */
    async refreshFromYandexApi() {
      this.lastListError = ''
      try {
        const res = await $fetch('/api/ote/instances', { credentials: 'include' })
        if (res && res.ycFolderConfigured === false) {
          this.items = []
          this.tcTable = null
          this.listSource = 'no_folder'
          const hint = typeof res.listHint === 'string' ? res.listHint.trim() : ''
          this.lastListError =
            hint || 'Каталог облака для вашей группы не настроен. Обратитесь к администратору.'
          return
        }
        if (Array.isArray(res.items)) {
          const prevItems = this.items
          this.items = res.items.map((row) => {
            const prev = prevItems.find((e) => e.id === row.id)
            return mergeOteClientRow(prev, row)
          })
          this.listSource = 'yc'
          this.tcTable = res.tcTable && typeof res.tcTable === 'object' ? res.tcTable : null
        } else {
          this.items = []
          this.tcTable = null
          this.listSource = 'error'
          this.lastListError = 'Ответ сервера без списка окружений'
        }
      } catch (e) {
        const msg = e?.data?.message || e?.message || String(e)
        this.items = []
        this.tcTable = null
        this.listSource = 'error'
        this.lastListError = msg
        throw e
      }
    },
    resetFilters() {
      this.filters = {
        query: '',
        product: '',
        status: '',
        type: '',
        onlyMine: false,
      }
    },
    setRunning(id, running) {
      const row = this.items.find((e) => e.id === id)
      if (!row) return
      row.status = running ? OTE_STATUS.RUNNING : OTE_STATUS.STOPPED
      row.lastOperation = running
        ? { kind: 'start', label: 'Старт' }
        : { kind: 'stop', label: 'Стоп' }
      row.updatedAt = new Date().toISOString()
    },
    remove(id) {
      this.items = this.items.filter((e) => e.id !== id)
    },
    create(payload) {
      const now = new Date().toISOString()
      const row = {
        id: newId(this.items),
        mine: true,
        name: payload.name,
        product: 'CaseOne',
        type: payload.envTypeName,
        status: OTE_STATUS.RUNNING,
        instances: { ready: 0, total: 1 },
        lastOperation: { kind: 'start', label: 'Старт' },
        updatedAt: now,
        caseOneVersion: payload.caseOneVersion,
        history: [{ at: now, text: 'Создание окружения (вы)' }],
        lastBuild: null,
        instancesDetail: [],
      }
      this.items.unshift(row)
      return row
    },
  },
})
