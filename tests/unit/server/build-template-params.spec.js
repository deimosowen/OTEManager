import { describe, it, expect } from 'vitest'
import { mergeBuildTemplateOverrides, parseBuildTemplateParams } from '~/server/utils/build-template-params.js'
import { mergeParamsFromTemplateAndOverrides } from '~/server/utils/ote-build-template-queue.js'

describe('parseBuildTemplateParams', () => {
  it('нормализует объект в строковые значения', () => {
    expect(parseBuildTemplateParams({ 'metadata.tag': 'x', empty: null })).toEqual({
      'metadata.tag': 'x',
      empty: '',
    })
  })

  it('возвращает {} для не-объекта', () => {
    expect(parseBuildTemplateParams(null)).toEqual({})
    expect(parseBuildTemplateParams([])).toEqual({})
  })

  it('отбрасывает пустые ключи', () => {
    expect(parseBuildTemplateParams({ '  ': 'v', ok: '1' })).toEqual({ ok: '1' })
  })
})

describe('mergeBuildTemplateOverrides', () => {
  it('overrides перекрывают base', () => {
    const out = mergeBuildTemplateOverrides({ a: '1', b: '2' }, { b: '9' })
    expect(out).toEqual({ a: '1', b: '9' })
  })
})

describe('mergeParamsFromTemplateAndOverrides', () => {
  it('разбирает JSON шаблона и мержит overrides', () => {
    const merged = mergeParamsFromTemplateAndOverrides(JSON.stringify({ k: 'fromTpl' }), { k: 'win', x: 'y' })
    expect(merged).toEqual({ k: 'win', x: 'y' })
  })

  it('при битом JSON шаблона берёт только overrides', () => {
    const merged = mergeParamsFromTemplateAndOverrides('not json', { only: '1' })
    expect(merged).toEqual({ only: '1' })
  })
})
