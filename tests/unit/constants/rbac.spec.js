import { describe, it, expect } from 'vitest'
import { ROLE_CODES, userHasAdminRole } from '~/constants/rbac'

describe('userHasAdminRole', () => {
  it('true если в массиве есть admin', () => {
    expect(userHasAdminRole([ROLE_CODES.USER, ROLE_CODES.ADMIN])).toBe(true)
  })

  it('false без admin', () => {
    expect(userHasAdminRole([ROLE_CODES.USER])).toBe(false)
  })

  it('false для не-массива', () => {
    expect(userHasAdminRole(null)).toBe(false)
    expect(userHasAdminRole('admin')).toBe(false)
  })
})
