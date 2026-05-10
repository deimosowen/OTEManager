import { requireOteUser } from '../../../utils/require-ote-auth.js'
import { dismissFeatureAnnouncementForUser } from '../../../utils/feature-announcements.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  let body = {}
  try {
    body = await readBody(event)
  } catch {
    body = {}
  }
  const id = body && typeof body === 'object' ? body.id : undefined
  if (typeof id !== 'string' || !id.trim()) {
    throw createError({ statusCode: 400, message: 'Укажите id анонса' })
  }
  return dismissFeatureAnnouncementForUser(user, id.trim())
})
