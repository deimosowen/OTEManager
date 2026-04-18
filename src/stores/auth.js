import { defineStore } from 'pinia'
import { safeReturnPath } from '~/utils/safe-return-path'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
  }),
  getters: {
    isLoggedIn: (s) => Boolean(s.user),
    displayName: (s) => s.user?.name || 'Гость',
    initials: (s) => {
      const n = s.user?.name || 'GM'
      const parts = n.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
      return n.slice(0, 2).toUpperCase()
    },
  },
  actions: {
    setUser(user) {
      this.user = user
    },
    /** Редирект на серверный маршрут OAuth Яндекса */
    startYandexLogin(returnPath = '/') {
      const safe = safeReturnPath(returnPath)
      const url = `/api/auth/yandex?return=${encodeURIComponent(safe)}`
      if (import.meta.client) {
        window.location.href = url
      }
    },
    async logout() {
      if (import.meta.client) {
        try {
          await fetchInternalApi('/api/auth/logout', { method: 'POST' })
        } catch {
          /* сеть */
        }
      }
      this.user = null
    },
  },
})
