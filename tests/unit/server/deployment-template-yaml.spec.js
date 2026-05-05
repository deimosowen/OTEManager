import { describe, it, expect } from 'vitest'
import { assertValidYamlString } from '~/server/utils/deployment-template-yaml.js'

describe('assertValidYamlString', () => {
  it('пропускает валидный YAML', () => {
    expect(assertValidYamlString('foo: bar\n')).toBe('foo: bar\n')
  })

  it('бросает на пустой строке', () => {
    expect(() => assertValidYamlString('   ')).toThrow(/пустым/)
  })

  it('бросает на синтаксически неверном YAML', () => {
    expect(() => assertValidYamlString('foo: [ broken')).toThrow(/Некорректный YAML/)
  })
})
