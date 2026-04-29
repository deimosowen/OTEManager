import { ref } from 'vue'

const favoriteIds = ref(/** @type {string[]} */ ([]))
const recentEntries = ref(/** @type {{ id: string, at: number }[]} */ ([]))

let recentTimer = null
const DEBOUNCE_MS = 400

function applyPayload(data) {
  if (!data || typeof data !== 'object') return
  favoriteIds.value = Array.isArray(data.favoriteIds) ? data.favoriteIds.map(String) : []
  recentEntries.value = Array.isArray(data.recent)
    ? data.recent.map((r) => ({
        id: String(r.buildTemplateId),
        at: Number(r.lastUsedAt) || 0,
      }))
    : []
}

function flushRecentTimer() {
  if (recentTimer) {
    clearTimeout(recentTimer)
    recentTimer = null
  }
}

/**
 * Избранные и недавние шаблоны сборки (БД, привязка к аккаунту).
 */
export function useOteTemplateShortcuts() {
  const toast = useToast()

  async function loadShortcuts() {
    if (!import.meta.client) return
    try {
      const data = await $fetch('/api/me/build-template-shortcuts', { credentials: 'include' })
      applyPayload(data)
    } catch (e) {
      const code = e?.statusCode ?? e?.status
      if (code === 401) {
        favoriteIds.value = []
        recentEntries.value = []
        return
      }
      console.warn(e)
    }
  }

  async function toggleFavorite(id) {
    if (!import.meta.client) return
    try {
      const data = await $fetch('/api/me/build-template-shortcuts/favorite', {
        method: 'POST',
        body: { buildTemplateId: Number(id) },
        credentials: 'include',
      })
      applyPayload(data)
    } catch (e) {
      toast.show(e?.data?.message || e?.message || 'Не удалось обновить избранное', 'error')
    }
  }

  async function postRecent(id) {
    const data = await $fetch('/api/me/build-template-shortcuts/recent', {
      method: 'POST',
      body: { buildTemplateId: Number(id) },
      credentials: 'include',
    })
    applyPayload(data)
  }

  /**
   * @param {string | number} id
   * @param {{ immediate?: boolean }} [options]
   */
  async function recordRecent(id, options = {}) {
    const sid = String(id || '').trim()
    if (!sid || !import.meta.client) return

    if (options.immediate) {
      flushRecentTimer()
      try {
        await postRecent(sid)
      } catch (e) {
        const code = e?.statusCode ?? e?.status
        if (code !== 401) console.warn(e)
      }
      return
    }

    flushRecentTimer()
    recentTimer = setTimeout(() => {
      recentTimer = null
      void postRecent(sid).catch((e) => {
        const code = e?.statusCode ?? e?.status
        if (code !== 401) console.warn(e)
      })
    }, DEBOUNCE_MS)
  }

  function orderedRecentIds() {
    return recentEntries.value.map((e) => e.id)
  }

  function isFavorite(id) {
    return favoriteIds.value.includes(String(id))
  }

  return {
    favoriteIds,
    recentEntries,
    loadShortcuts,
    toggleFavorite,
    isFavorite,
    recordRecent,
    orderedRecentIds,
  }
}
