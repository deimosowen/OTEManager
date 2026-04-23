import { defineStore } from 'pinia'
import { $fetch } from 'ofetch'
import { OTE_STATUS } from '~/constants/ote'
import { createSeedEnvironments } from '~/mocks/seedEnvironments'

function newId(list) {
  const nums = list.map((e) => Number(e.id)).filter((n) => !Number.isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return String(max + 1)
}

export const useEnvironmentsStore = defineStore('environments', {
  state: () => ({
    /**
     * `pending` — первая загрузка списка (пустой список, без демо-строк);
     * `yc` — из Compute; `seed` — демо после ошибки или вручную.
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
      if (idx >= 0) this.items[idx] = { ...this.items[idx], ...item }
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
        if (Array.isArray(res.items)) {
          this.items = res.items
          this.listSource = 'yc'
          this.tcTable = res.tcTable && typeof res.tcTable === 'object' ? res.tcTable : null
        } else {
          this.useSeedList()
          this.lastListError = 'Ответ API без массива items'
        }
      } catch (e) {
        const msg = e?.data?.message || e?.message || String(e)
        this.useSeedList()
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
