import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('ofetch', () => ({
  $fetch: vi.fn(),
}))

import { $fetch } from 'ofetch'
import { setActivePinia, createPinia } from 'pinia'
import { useEnvironmentsStore } from '~/stores/environments'

describe('useEnvironmentsStore.refreshFromYandexApi', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked($fetch).mockReset()
  })

  it('ycFolderConfigured: false → no_folder и подсказка', async () => {
    vi.mocked($fetch).mockResolvedValueOnce({
      ycFolderConfigured: false,
      listHint: 'Нужен каталог',
      items: [],
    })
    const store = useEnvironmentsStore()
    await store.refreshFromYandexApi()
    expect(store.listSource).toBe('no_folder')
    expect(store.items).toEqual([])
    expect(store.tcTable).toBeNull()
    expect(store.lastListError).toBe('Нужен каталог')
  })

  it('успешный список → yc и слияние строк', async () => {
    vi.mocked($fetch).mockResolvedValueOnce({
      items: [{ id: 'vm1', name: 'ote-a' }],
      tcTable: { summary: { rows: 1 } },
    })
    const store = useEnvironmentsStore()
    await store.refreshFromYandexApi()
    expect(store.listSource).toBe('yc')
    expect(store.items).toHaveLength(1)
    expect(store.tcTable).toEqual({ summary: { rows: 1 } })
  })

  it('ответ без массива items → error', async () => {
    vi.mocked($fetch).mockResolvedValueOnce({ foo: 1 })
    const store = useEnvironmentsStore()
    await store.refreshFromYandexApi()
    expect(store.listSource).toBe('error')
    expect(store.items).toEqual([])
  })

  it('исключение от $fetch → error и проброс', async () => {
    vi.mocked($fetch).mockRejectedValueOnce(Object.assign(new Error('network'), { data: { message: '502' } }))
    const store = useEnvironmentsStore()
    await expect(store.refreshFromYandexApi()).rejects.toThrow()
    expect(store.listSource).toBe('error')
    expect(store.lastListError).toBeTruthy()
  })
})
