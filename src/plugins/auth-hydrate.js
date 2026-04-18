import { useAuthStore } from '~/stores/auth'
import { fetchInternalApi } from '~/composables/internalApi'

/**
 * SSR: пользователь уже в event.context (Nitro middleware), без HTTP к API.
 * Client: `GET /api/auth/session` через fetchInternalApi (путь `/api/auth/me` давал warn Vue Router в dev).
 */
export default defineNuxtPlugin({
  name: 'auth-hydrate',
  /** Не `enforce: 'pre'`: до Pinia pre-плагины падают с «no active Pinia» и SSR отдаёт 500. */
  dependsOn: ['pinia'],
  async setup(nuxtApp) {
    const auth = useAuthStore(nuxtApp.$pinia)
    if (auth.user) return

    if (import.meta.server) {
      const event = useRequestEvent()
      const u = event?.context?.oteUser
      if (u) auth.setUser(u)
      return
    }

    try {
      const r = await fetchInternalApi('/api/auth/session')
      if (r.ok) {
        const data = await r.json()
        if (data?.user) auth.setUser(data.user)
      }
    } catch {
      /* offline */
    }
  },
})
