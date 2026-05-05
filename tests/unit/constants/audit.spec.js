import { describe, it, expect } from 'vitest'
import { AUDIT_ACTION, AUDIT_APP_GROUP_RESOURCE_PREFIX, auditActionLabel } from '~/constants/audit'

describe('auditActionLabel', () => {
  it('возвращает русскую подпись для известного кода', () => {
    expect(auditActionLabel(AUDIT_ACTION.LOGIN)).toBe('Вход в систему')
  })

  it('возвращает код как есть для неизвестного', () => {
    expect(auditActionLabel('unknown_custom')).toBe('unknown_custom')
  })
})

describe('AUDIT_APP_GROUP_RESOURCE_PREFIX', () => {
  it('стабильный префикс для групп в журнале', () => {
    expect(AUDIT_APP_GROUP_RESOURCE_PREFIX).toBe('app-group:')
  })
})
