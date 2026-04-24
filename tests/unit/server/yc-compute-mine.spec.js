import { describe, it, expect } from 'vitest'
import { computeOteRowMine } from '~/server/utils/yc/compute.js'

describe('computeOteRowMine', () => {
  it('совпадает полный email с run-by', () => {
    expect(
      computeOteRowMine('ivanov@corp.ru', { login: '', email: 'ivanov@corp.ru' }),
    ).toBe(true)
  })

  it('совпадает local-part почты с run-by без домена', () => {
    expect(
      computeOteRowMine('ivanov', { login: 'ivanov@corp.ru', email: 'ivanov@corp.ru' }),
    ).toBe(true)
  })

  it('совпадает local-part при логине как у почты (полная строка)', () => {
    expect(
      computeOteRowMine('ivanov', { login: 'ivanov@corp.ru', email: '' }),
    ).toBe(true)
  })

  it('совпадает короткое имя после DOMAIN\\', () => {
    expect(
      computeOteRowMine('CORP\\ivanov', { login: 'ivanov@corp.ru', email: 'ivanov@corp.ru' }),
    ).toBe(true)
  })

  it('не помечает чужое имя', () => {
    expect(
      computeOteRowMine('petrov', { login: 'ivanov@corp.ru', email: 'ivanov@corp.ru' }),
    ).toBe(false)
  })
})
