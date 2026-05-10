import { describe, expect, it } from 'vitest'
import { evaluateIfElseCondition, ifElseRowMatchesScope } from '~/server/utils/automation-if-else-eval.js'

describe('automation-if-else-eval', () => {
  const rows = [
    { mine: true, oteName: 'alpha', name: 'alpha', status: 'running' },
    { mine: false, oteName: 'beta', name: 'grp:beta', status: 'stopped' },
  ]

  it('ifElseRowMatchesScope: только мои', () => {
    expect(ifElseRowMatchesScope(rows[0], { authorScope: 'mine', tagScope: 'any', tagValue: '' })).toBe(true)
    expect(ifElseRowMatchesScope(rows[1], { authorScope: 'mine', tagScope: 'any', tagValue: '' })).toBe(false)
  })

  it('ifElseRowMatchesScope: конкретный тег', () => {
    expect(
      ifElseRowMatchesScope(rows[1], { authorScope: 'any', tagScope: 'specific', tagValue: 'beta' }),
    ).toBe(true)
    expect(
      ifElseRowMatchesScope(rows[0], { authorScope: 'any', tagScope: 'specific', tagValue: 'beta' }),
    ).toBe(false)
  })

  it('evaluateIfElseCondition: есть работающая среди моих', () => {
    expect(
      evaluateIfElseCondition(
        { authorScope: 'mine', tagScope: 'any', machinePredicate: 'running' },
        rows,
      ),
    ).toBe(true)
  })

  it('evaluateIfElseCondition: остановленная по тегу', () => {
    expect(
      evaluateIfElseCondition(
        { authorScope: 'any', tagScope: 'specific', tagValue: 'beta', machinePredicate: 'stopped' },
        rows,
      ),
    ).toBe(true)
  })

  it('evaluateIfElseCondition: нет в каталоге по тегу', () => {
    expect(
      evaluateIfElseCondition(
        { authorScope: 'any', tagScope: 'specific', tagValue: 'ghost', machinePredicate: 'missing' },
        rows,
      ),
    ).toBe(true)
  })
})
