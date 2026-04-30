import { defineStore } from 'pinia'
import { fetchInternalApi } from '~/composables/internalApi'

export const useAppNotificationsStore = defineStore('appNotifications', {
  state: () => ({
    items: [],
    unreadCount: 0,
    loading: false,
    lastError: '',
  }),
  actions: {
    async fetchList() {
      this.loading = true
      this.lastError = ''
      try {
        const res = await fetchInternalApi('/api/me/notifications')
        if (!res.ok) {
          this.lastError = `HTTP ${res.status}`
          return
        }
        const data = await res.json()
        this.items = Array.isArray(data?.items) ? data.items : []
        this.unreadCount = typeof data?.unreadCount === 'number' ? data.unreadCount : Number(data?.unreadCount) || 0
      } catch {
        this.lastError = 'Сеть'
      } finally {
        this.loading = false
      }
    },

    /**
     * Пуш через SSE или дубль из поллинга игнорируется по id.
     * @param {{
     *   id: number,
     *   createdAt?: string,
     *   readAt: string | null,
     *   kind: string,
     *   title: string,
     *   body: string | null,
     *   href: string,
     *   tcCreationId: number,
     * }} notification
     */
    applyIncoming(notification) {
      const id = typeof notification?.id === 'number' ? notification.id : Number(notification?.id)
      if (!Number.isFinite(id)) return
      if (this.items.some((x) => x.id === id)) return
      this.items = [{ ...notification, id }, ...this.items].slice(0, 80)
      this.unreadCount = this.items.filter((x) => !x.readAt).length
    },

    patchAfterRead(id) {
      const n = Number(id)
      const now = new Date().toISOString()
      this.items = this.items.map((x) => (x.id === n ? { ...x, readAt: x.readAt || now } : x))
      this.unreadCount = this.items.filter((x) => !x.readAt).length
    },

    removeLocal(id) {
      const n = Number(id)
      this.items = this.items.filter((x) => x.id !== n)
      this.unreadCount = this.items.filter((x) => !x.readAt).length
    },

    markAllReadLocal() {
      const now = new Date().toISOString()
      this.items = this.items.map((x) => ({ ...x, readAt: x.readAt || now }))
      this.unreadCount = 0
    },

    /** @returns {Promise<boolean>} */
    async deleteOne(id) {
      const res = await fetchInternalApi(`/api/me/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) return false
      this.removeLocal(id)
      return true
    },

    /** @returns {Promise<boolean>} */
    async markRead(id) {
      const res = await fetchInternalApi(`/api/me/notifications/${encodeURIComponent(id)}/read`, {
        method: 'POST',
      })
      if (!res.ok) return false
      this.patchAfterRead(id)
      return true
    },

    async markAllRead() {
      const res = await fetchInternalApi('/api/me/notifications/read-all', { method: 'POST' })
      if (!res.ok) return false
      this.markAllReadLocal()
      return true
    },
  },
})
