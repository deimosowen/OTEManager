import { describe, expect, it } from 'vitest'
import { sumListResourcesFromMembers } from '~/server/utils/yc/compute.js'

describe('sumListResourcesFromMembers', () => {
  it('суммирует vCPU и RAM по нескольким ВМ', () => {
    const g = 1024 * 1024 * 1024
    const out = sumListResourcesFromMembers([
      { resources: { cores: 2, memory: 4 * g } },
      { resources: { cores: 4, memory: 8 * g } },
    ])
    expect(out.listTotalCores).toBe(6)
    expect(out.listTotalMemoryGb).toBe(12)
  })

  it('пустой список даёт нули', () => {
    const out = sumListResourcesFromMembers([])
    expect(out.listTotalCores).toBe(0)
    expect(out.listTotalMemoryGb).toBe(0)
  })
})
