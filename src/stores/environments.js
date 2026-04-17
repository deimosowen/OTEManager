import { defineStore } from 'pinia'
import { OTE_STATUS } from '~/constants/ote'
import { createSeedEnvironments } from '~/mocks/seedEnvironments'

function newId(list) {
  const nums = list.map((e) => Number(e.id)).filter((n) => !Number.isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return String(max + 1)
}

export const useEnvironmentsStore = defineStore('environments', {
  state: () => ({
    items: createSeedEnvironments(),
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
        if (q && !row.name.toLowerCase().includes(q)) return false
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
