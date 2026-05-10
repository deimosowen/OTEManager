import { describe, expect, it } from 'vitest'
import { collectAutomationExecutionOrder } from '~/server/utils/automation-exec-order.js'

describe('collectAutomationExecutionOrder', () => {
  it('идёт только по ветке «Да», если так вернул расчёт условия', async () => {
    const nodes = [
      { id: 't', data: { kind: 'trigger', variant: 'manual' } },
      { id: 'c', data: { kind: 'condition', variant: 'if_else', config: {} } },
      { id: 'a', data: { kind: 'action', variant: 'notify_bell' } },
      { id: 'b', data: { kind: 'action', variant: 'notify_bell' } },
    ]
    const edges = [
      { source: 't', target: 'c' },
      { source: 'c', target: 'a', sourceHandle: 'yes' },
      { source: 'c', target: 'b', sourceHandle: 'no' },
    ]
    const order = await collectAutomationExecutionOrder('t', nodes, edges, async () => 'yes')
    expect(order).toEqual(['t', 'c', 'a'])
  })

  it('при слиянии веток узел после развилки посещается один раз', async () => {
    const nodes = [
      { id: 't', data: { kind: 'trigger', variant: 'manual' } },
      { id: 'c', data: { kind: 'condition', variant: 'if_else' } },
      { id: 'x', data: { kind: 'action', variant: 'notify_bell' } },
      { id: 'y', data: { kind: 'action', variant: 'notify_bell' } },
      { id: 'z', data: { kind: 'action', variant: 'notify_bell' } },
    ]
    const edges = [
      { source: 't', target: 'c' },
      { source: 'c', target: 'x', sourceHandle: 'yes' },
      { source: 'c', target: 'y', sourceHandle: 'no' },
      { source: 'x', target: 'z' },
      { source: 'y', target: 'z' },
    ]
    const orderYes = await collectAutomationExecutionOrder('t', nodes, edges, async () => 'yes')
    expect(orderYes).toEqual(['t', 'c', 'x', 'z'])
    const orderNo = await collectAutomationExecutionOrder('t', nodes, edges, async () => 'no')
    expect(orderNo).toEqual(['t', 'c', 'y', 'z'])
  })
})
