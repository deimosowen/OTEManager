import { describe, it, expect } from 'vitest'
import { FILTER_STATUS_OPTIONS, OTE_STATUS, OTE_STATUS_LABELS } from '~/constants/ote'

describe('OTE_STATUS_LABELS', () => {
  it('все основные статусы имеют подпись', () => {
    expect(OTE_STATUS_LABELS[OTE_STATUS.RUNNING]).toBeTruthy()
    expect(OTE_STATUS_LABELS[OTE_STATUS.STOPPED]).toBeTruthy()
    expect(OTE_STATUS_LABELS[OTE_STATUS.DELETING]).toBeTruthy()
  })
})

describe('FILTER_STATUS_OPTIONS', () => {
  it('первая опция — общий фильтр «Статус»', () => {
    expect(FILTER_STATUS_OPTIONS[0].value).toBe('')
  })
})
