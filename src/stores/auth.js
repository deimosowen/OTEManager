import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    /** В проде заменить на реальный OAuth (Яндекс) */
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
    loginWithYandexMock() {
      this.user = { name: 'Aleksandr Demo', email: 'demo@example.com' }
    },
    logout() {
      this.user = null
    },
  },
})
