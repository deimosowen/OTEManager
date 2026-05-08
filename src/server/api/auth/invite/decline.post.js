import { clearGroupInviteCookie } from '../../../utils/group-invite.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

/** Отказ от приглашения: только сброс cookie. */
export default defineEventHandler(async (event) => {
  requireOteUser(event)
  clearGroupInviteCookie(event)
  return { ok: true }
})
