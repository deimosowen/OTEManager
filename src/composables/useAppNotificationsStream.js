import { onBeforeUnmount, watch } from 'vue'
import { useAppNotificationsStore } from '~/stores/app-notifications'
import { useAuthStore } from '~/stores/auth'

function streamUrlAbsolute() {
  return new URL('/api/me/notifications/stream', `${window.location.origin.replace(/\/+$/, '')}/`).href
}

/**
 * Одноразовое SSE соединение аутентифицированному пользователю: событие `notification`.
 * При нескольких репликах общий bus недоступен — список обновится при открытии панели.
 */
export function useAppNotificationsStream() {
  const auth = useAuthStore()
  const store = useAppNotificationsStore()

  /** @type {EventSource | null} */
  let es = null

  function disconnect() {
    if (es) {
      es.close()
      es = null
    }
  }

  function connect() {
    disconnect()
    es = new EventSource(streamUrlAbsolute(), { withCredentials: true })
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data || '{}')
        if (p?.type === 'notification' && p.notification) store.applyIncoming(p.notification)
      } catch {}
    }
  }

  if (import.meta.client) {
    watch(
      () => auth.isLoggedIn,
      (v) => {
        if (v) {
          void store.fetchList()
          connect()
        } else {
          disconnect()
          store.items = []
          store.unreadCount = 0
        }
      },
      { immediate: true },
    )

    onBeforeUnmount(disconnect)
  }
}
