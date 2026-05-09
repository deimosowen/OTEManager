import { requireOteUser } from '../../../utils/require-ote-auth.js'
import { dismissOnboardingHintsForUser } from '../../../utils/onboarding-hints.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  await dismissOnboardingHintsForUser(user)
  return { ok: true, showOnboardingHints: false }
})
