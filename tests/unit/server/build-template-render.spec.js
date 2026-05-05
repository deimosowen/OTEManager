import { describe, it, expect } from 'vitest'
import { extractPercentPlaceholders, renderYamlPercentPlaceholders } from '~/server/utils/build-template-render.js'

describe('extractPercentPlaceholders', () => {
  it('находит ключи в плейсхолдерах %a.b%', () => {
    expect(extractPercentPlaceholders('x: %metadata.tag%\ny: %caseone.version%')).toEqual(
      expect.arrayContaining(['caseone.version', 'metadata.tag']),
    )
  })

  it('возвращает пустой массив для строки без плейсхолдеров', () => {
    expect(extractPercentPlaceholders('foo: bar')).toEqual([])
  })
})

describe('renderYamlPercentPlaceholders', () => {
  it('подставляет значения', () => {
    const out = renderYamlPercentPlaceholders('name: %metadata.tag%', { 'metadata.tag': 't1' })
    expect(out).toBe('name: t1')
  })

  it('бросает если не хватает ключа', () => {
    expect(() => renderYamlPercentPlaceholders('x: %a%\ny: %b%', { a: '1' })).toThrow(/Не заданы параметры/)
  })
})
