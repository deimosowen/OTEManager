import { describe, expect, it } from 'vitest'
import {
  isCatalogUserNewForOnboarding,
  ONBOARDING_NEW_USER_MAX_AGE_MS,
} from '~/server/utils/onboarding-hints.js'

describe('onboarding-hints', () => {
  it('считает пользователя «новым», если first_seen в пределах окна', () => {
    const now = 1_700_000_000_000
    expect(isCatalogUserNewForOnboarding(now - 1000, now)).toBe(true)
    expect(isCatalogUserNewForOnboarding(now - ONBOARDING_NEW_USER_MAX_AGE_MS, now)).toBe(true)
  })

  it('не считает пользователя «новым», если first_seen старше окна', () => {
    const now = 1_700_000_000_000
    expect(isCatalogUserNewForOnboarding(now - ONBOARDING_NEW_USER_MAX_AGE_MS - 1, now)).toBe(false)
  })
})
