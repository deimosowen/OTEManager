import { describe, expect, it } from 'vitest'
import {
  defaultOteYcColumnPrefItems,
  normalizeOteYcColumnPrefItems,
  OTE_YC_COLUMN_IDS,
  OTE_YC_DEFAULT_VISIBLE_IDS,
  OTE_YC_REQUIRED_COLUMN_ID,
} from '../../../src/constants/ote-list-columns.js'

describe('ote-list-columns', () => {
  it('defaults: vCPU/RAM и метки YC скрыты; остальное по OTE_YC_DEFAULT_VISIBLE_IDS', () => {
    const d = defaultOteYcColumnPrefItems()
    expect(d.map((x) => x.id)).toEqual(OTE_YC_COLUMN_IDS)
    expect(d.every((x) => OTE_YC_DEFAULT_VISIBLE_IDS.has(x.id) === x.visible)).toBe(true)
  })

  it('normalize сохраняет отключённые и обязательный «ОТЕ»', () => {
    const items = normalizeOteYcColumnPrefItems([
      { id: 'card', visible: false },
      { id: OTE_YC_REQUIRED_COLUMN_ID, visible: false },
    ])
    const ote = items.find((x) => x.id === OTE_YC_REQUIRED_COLUMN_ID)
    expect(ote?.visible).toBe(true)
    const card = items.find((x) => x.id === 'card')
    expect(card?.visible).toBe(false)
  })

  it('normalize добавляет новые колонки реестра с дефолтной видимостью для ядра', () => {
    const items = normalizeOteYcColumnPrefItems([{ id: 'ote', visible: true }])
    expect(items.length).toBe(OTE_YC_COLUMN_IDS.length)
    const lbl = items.find((x) => x.id === 'ycLbl_branchName')
    expect(lbl).toBeTruthy()
    expect(lbl?.visible).toBe(false)
  })

  it('normalize сохраняет порядок колонок из сохранённого списка', () => {
    const custom = [
      { id: 'card', visible: true },
      { id: 'status', visible: true },
      { id: 'ote', visible: true },
    ]
    const items = normalizeOteYcColumnPrefItems(custom)
    expect(items.slice(0, 3).map((x) => x.id)).toEqual(['card', 'status', 'ote'])
  })
})
