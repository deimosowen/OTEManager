import { describe, expect, it } from 'vitest'
import { automationVarNamespaceFromNodeId } from '../../../src/utils/automation-var-namespace.js'

describe('automationVarNamespaceFromNodeId', () => {
  it('maps vue-flow ids to stable identifiers', () => {
    expect(automationVarNamespaceFromNodeId('b-12')).toBe('b_12')
    expect(automationVarNamespaceFromNodeId('  b-3  ')).toBe('b_3')
  })

  it('prefixes numeric-leading segments', () => {
    expect(automationVarNamespaceFromNodeId('42x')).toMatch(/^_/)
  })

  it('never returns empty string', () => {
    expect(automationVarNamespaceFromNodeId('')).toBe('_node')
    expect(automationVarNamespaceFromNodeId(null)).toBe('_node')
  })
})
