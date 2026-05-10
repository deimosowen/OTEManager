import { describe, expect, it } from 'vitest'
import {
  AUTOMATION_GRAPH_LIMITS,
  normalizeVueFlowHandle,
  validateAutomationConnection,
  validateAutomationGraph,
} from '../../../src/utils/automation-graph.js'

function node(id, kind, variant) {
  return {
    id,
    type: 'autoBlock',
    position: { x: 0, y: 0 },
    data: { kind, variant, iconKey: 'Play', title: id, subtitle: '' },
  }
}

describe('validateAutomationGraph', () => {
  it('принимает пустой граф', () => {
    const r = validateAutomationGraph([], [])
    expect(r.ok).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('отклоняет связь к триггеру', () => {
    const t = node('t', 'trigger', 'manual')
    const a = node('a', 'action', 'notify_bell')
    const r = validateAutomationGraph([t, a], [{ id: 'e1', source: 'a', target: 't' }])
    expect(r.ok).toBe(false)
    expect(r.errors.some((x) => x.includes('триггер'))).toBe(true)
  })

  it('отклоняет цикл', () => {
    const a = node('a', 'action', 'notify_bell')
    const b = node('b', 'action', 'notify_bell')
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'a' },
    ]
    const r = validateAutomationGraph([a, b], edges)
    expect(r.ok).toBe(false)
    expect(r.errors.some((x) => x.includes('цикл'))).toBe(true)
  })

  it('разрешает несколько исходящих связей с триггера', () => {
    const t = node('t', 'trigger', 'schedule')
    const a = node('a', 'action', 'notify_bell')
    const b = node('b', 'action', 'notify_bell')
    const edges = [
      { id: 'e1', source: 't', target: 'a' },
      { id: 'e2', source: 't', target: 'b' },
    ]
    const r = validateAutomationGraph([t, a, b], edges)
    expect(r.ok).toBe(true)
  })

  it('отклоняет лишний sourceHandle у действия', () => {
    const a = node('a', 'action', 'notify_bell')
    const b = node('b', 'action', 'notify_bell')
    const edges = [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'yes' }]
    const r = validateAutomationGraph([a, b], edges)
    expect(r.ok).toBe(false)
  })

  it('отклоняет вход «Ожидание TeamCity» не от TC-действия', () => {
    const bell = node('b', 'action', 'notify_bell')
    const w = node('w', 'wait', 'teamcity_build')
    const edges = [{ id: 'e1', source: 'b', target: 'w' }]
    const r = validateAutomationGraph([bell, w], edges)
    expect(r.ok).toBe(false)
    expect(r.errors.some((x) => x.includes('Ожидание'))).toBe(true)
  })

  it('принимает цепочку создание из шаблона → ожидание TeamCity', () => {
    const t = node('t', 'trigger', 'manual')
    const c = node('c', 'action', 'create_template')
    const w = node('w', 'wait', 'teamcity_build')
    const edges = [
      { id: 'e1', source: 't', target: 'c' },
      { id: 'e2', source: 'c', target: 'w' },
    ]
    const r = validateAutomationGraph([t, c, w], edges)
    expect(r.ok).toBe(true)
  })

  it('ограничивает число узлов', () => {
    const nodes = Array.from({ length: AUTOMATION_GRAPH_LIMITS.maxNodes + 1 }, (_, i) =>
      node(`n${i}`, 'action', 'notify_bell'),
    )
    const r = validateAutomationGraph(nodes, [])
    expect(r.ok).toBe(false)
  })
})

describe('normalizeVueFlowHandle', () => {
  it('чистит строковые артефакты DOM', () => {
    expect(normalizeVueFlowHandle(null)).toBe(null)
    expect(normalizeVueFlowHandle(undefined)).toBe(null)
    expect(normalizeVueFlowHandle('')).toBe(null)
    expect(normalizeVueFlowHandle('null')).toBe(null)
    expect(normalizeVueFlowHandle('yes')).toBe('yes')
  })
})

describe('validateAutomationConnection', () => {
  const t = node('t', 'trigger', 'manual')
  const c = node('c', 'condition', 'if_else')
  const a = node('a', 'action', 'notify_bell')

  it('игнорирует осиротевшую связь от триггера при проверке исходящих', () => {
    const ghostEdges = [{ id: 'e0', source: 't', target: 'deleted' }]
    const r = validateAutomationConnection({ source: 't', target: 'a' }, [t, a], ghostEdges)
    expect(r.ok).toBe(true)
  })

  it('блокирует цикл при новой связи', () => {
    const edges = [{ id: 'e1', source: 'a', target: 'c' }]
    const r = validateAutomationConnection({ source: 'c', target: 'a', sourceHandle: 'yes' }, [t, c, a], edges)
    expect(r.ok).toBe(false)
    expect(String(r.reason || '')).toMatch(/цикл/i)
  })

  it('разрешает простую связь от триггера', () => {
    const r = validateAutomationConnection({ source: 't', target: 'a' }, [t, a], [])
    expect(r.ok).toBe(true)
  })

  it('разрешает вторую связь от триггера к другому блоку', () => {
    const b = node('b', 'action', 'notify_bell')
    const edges = [{ id: 'e1', source: 't', target: 'a' }]
    const r = validateAutomationConnection({ source: 't', target: 'b' }, [t, a, b], edges)
    expect(r.ok).toBe(true)
  })

  it('разрешает цепочку действие → действие после связи от триггера', () => {
    const b = node('b', 'action', 'notify_bell')
    const edges = [{ id: 'e1', source: 't', target: 'a' }]
    const r = validateAutomationConnection({ source: 'a', target: 'b' }, [t, a, b], edges)
    expect(r.ok).toBe(true)
  })

  it('принимает связь от триггера, если порт пришёл как строка null из DOM', () => {
    const r = validateAutomationConnection({ source: 't', target: 'a', sourceHandle: 'null' }, [t, a], [])
    expect(r.ok).toBe(true)
  })

  it('ловит повтор связи при разном представлении пустого sourceHandle', () => {
    const edges = [{ id: 'e1', source: 't', target: 'a', sourceHandle: undefined }]
    const r = validateAutomationConnection({ source: 't', target: 'a', sourceHandle: 'null' }, [t, a], edges)
    expect(r.ok).toBe(false)
    expect(String(r.reason || '')).toMatch(/такая связь уже есть|триггер/i)
  })

  it('нормализует порядок source/target когда триггер попал в target (жест Vue Flow)', () => {
    const r = validateAutomationConnection({ source: 'a', target: 't' }, [t, a], [])
    expect(r.ok).toBe(true)
  })

  it('блокирует связь колокольчик → ожидание TeamCity', () => {
    const bell = node('b', 'action', 'notify_bell')
    const w = node('w', 'wait', 'teamcity_build')
    const r = validateAutomationConnection({ source: 'b', target: 'w' }, [bell, w], [])
    expect(r.ok).toBe(false)
    expect(String(r.reason || '')).toMatch(/TeamCity/i)
  })
})
