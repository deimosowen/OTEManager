import { clearOteSession } from '../../utils/ote-session'

/** GET для простого выхода по ссылке (как в Mattermost_CaseOneBot). */
export default defineEventHandler((event) => {
  clearOteSession(event)
  return sendRedirect(event, '/login', 302)
})
