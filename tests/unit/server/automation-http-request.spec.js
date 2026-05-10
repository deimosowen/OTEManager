import { describe, expect, it } from 'vitest'
import { executeAutomationHttpRequest } from '../../../src/server/utils/automation-http-request.js'

describe('executeAutomationHttpRequest (SSRF guard)', () => {
  it('blocks link-local / metadata IPv4 without env bypass', async () => {
    const prev = process.env.AUTOMATION_HTTP_ALLOW_PRIVATE
    delete process.env.AUTOMATION_HTTP_ALLOW_PRIVATE
    const r = await executeAutomationHttpRequest({
      url: 'http://169.254.169.254/latest/meta-data/',
      method: 'GET',
      headers: [],
      timeoutMs: 5000,
    })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/запрещены/)
    if (prev !== undefined) process.env.AUTOMATION_HTTP_ALLOW_PRIVATE = prev
  })

  it('blocks empty method', async () => {
    const r = await executeAutomationHttpRequest({
      url: 'https://example.com/',
      method: 'NOPE',
      headers: [],
      timeoutMs: 5000,
    })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Недопустимый метод/)
  })
})
