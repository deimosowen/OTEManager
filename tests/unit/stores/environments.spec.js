import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEnvironmentsStore } from '~/stores/environments'
import { OTE_STATUS } from '~/constants/ote'

describe('useEnvironmentsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useEnvironmentsStore().useSeedList()
  })

  it('фильтрует по поисковой строке (имя)', () => {
    const store = useEnvironmentsStore()
    store.filters.query = 'ote-dev'
    const names = store.filteredItems.map((e) => e.name)
    expect(names.every((n) => n.toLowerCase().includes('ote-dev'))).toBe(true)
  })

  it('фильтрует по статусу', () => {
    const store = useEnvironmentsStore()
    store.filters.status = OTE_STATUS.STOPPED
    expect(store.filteredItems.every((e) => e.status === OTE_STATUS.STOPPED)).toBe(true)
  })

  it('фильтрует по автору (runBy, в т.ч. сегменты «a / b»)', () => {
    const store = useEnvironmentsStore()
    store.filters.author = 'user2'
    expect(store.filteredItems.map((e) => e.id)).toEqual(['2'])
    store.filters.author = ''
    store.items.push({
      id: '99',
      mine: false,
      name: 'ote-grouped',
      runBy: 'alice / bob',
      product: 'CaseOne',
      type: 'Linux Single',
      status: OTE_STATUS.RUNNING,
      instances: { ready: 1, total: 1 },
      lastOperation: { kind: 'start', label: 'Старт' },
      updatedAt: '2024-01-01T00:00:00.000Z',
      caseOneVersion: '2.31',
      history: [],
      lastBuild: null,
      instancesDetail: [],
    })
    store.filters.author = 'bob'
    expect(store.filteredItems.some((e) => e.id === '99')).toBe(true)
    expect(store.filteredItems.find((e) => e.id === '99')?.name).toBe('ote-grouped')
  })

  it('setRunning переключает статус и операцию', () => {
    const store = useEnvironmentsStore()
    const running = store.items.find((e) => e.status === OTE_STATUS.RUNNING)
    expect(running).toBeTruthy()
    store.setRunning(running.id, false)
    const updated = store.byId(running.id)
    expect(updated.status).toBe(OTE_STATUS.STOPPED)
    expect(updated.lastOperation.label).toBe('Стоп')
  })

  it('create добавляет окружение с mine=true', () => {
    const store = useEnvironmentsStore()
    const before = store.items.length
    store.create({
      name: 'ote-from-test',
      envTypeName: 'Linux Single',
      caseOneVersion: '2.31',
      deployTemplate: 'standard',
      dbVersion: 'pg14',
    })
    expect(store.items.length).toBe(before + 1)
    expect(store.items[0].name).toBe('ote-from-test')
    expect(store.items[0].mine).toBe(true)
  })
})
