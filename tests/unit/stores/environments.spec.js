import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEnvironmentsStore } from '~/stores/environments'
import { OTE_STATUS } from '~/constants/ote'

describe('useEnvironmentsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
