import { clearOteSession } from '../../utils/ote-session'

export default defineEventHandler((event) => {
  clearOteSession(event)
  return { ok: true }
})
