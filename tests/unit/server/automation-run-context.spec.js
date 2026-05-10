import { describe, expect, it } from 'vitest'
import {
  getAutomationVarByPath,
  interpolateAutomationDeep,
  interpolateAutomationTemplate,
  mergeAutomationOutputs,
  sanitizeAutomationContextKey,
} from '../../../src/server/utils/automation-run-context.js'

describe('automation-run-context', () => {
  it('sanitizeAutomationContextKey trims and falls back', () => {
    expect(sanitizeAutomationContextKey('', 'tpl')).toBe('tpl')
    expect(sanitizeAutomationContextKey('My Hook!', 'x')).toBe('My_Hook_')
    expect(sanitizeAutomationContextKey('123abc', 'z')).toBe('_123abc')
  })

  it('getAutomationVarByPath reads nested keys', () => {
    const vars = {
      b_12: { teamCityBuildId: '42', nested: { x: 1 } },
    }
    expect(getAutomationVarByPath(vars, 'b_12.teamCityBuildId')).toBe('42')
    expect(getAutomationVarByPath(vars, 'b_12.nested.x')).toBe(1)
    expect(getAutomationVarByPath(vars, 'missing')).toBeUndefined()
  })

  it('interpolateAutomationTemplate resolves vars paths', () => {
    const vars = { b_4: { id: 7 }, b_9: { status: 200 } }
    expect(interpolateAutomationTemplate('x-{{ b_4.id }}-y', vars)).toBe('x-7-y')
    expect(interpolateAutomationTemplate('{{ vars.b_9.status }}', vars)).toBe('200')
    expect(interpolateAutomationTemplate('{{ unknown }}', vars)).toBe('')
  })

  it('interpolateAutomationDeep walks objects', () => {
    const vars = { a: { b: 'hi' } }
    const out = interpolateAutomationDeep({ title: '{{ a.b }}', n: 3 }, vars)
    expect(out).toEqual({ title: 'hi', n: 3 })
  })

  it('mergeAutomationOutputs merges shallow per key', () => {
    const ctx = { vars: {} }
    mergeAutomationOutputs(ctx, 'b_5', { a: 1 })
    mergeAutomationOutputs(ctx, 'b_5', { b: 2 })
    expect(ctx.vars.b_5).toEqual({ a: 1, b: 2 })
  })
})
