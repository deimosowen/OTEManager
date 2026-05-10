import { ref } from 'vue'

/**
 * Список сценариев автоматизации (БД, группа каталога пользователя).
 */
export function useAutomationScenariosList() {
  const scenarios = ref(
    /** @type {{ id: number, groupId: number, name: string, status: string, enabled: boolean, updatedAt: number, createdAt?: number }[]} */ ([]),
  )
  const selectedScenarioId = ref(/** @type {number | null} */ (null))
  const loading = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const res = await $fetch('/api/ote/automation-scenarios', { credentials: 'include' })
      scenarios.value = Array.isArray(res?.scenarios) ? res.scenarios : []
      selectedScenarioId.value = scenarios.value[0]?.id ?? null
    } catch (e) {
      error.value = e?.data?.message || e?.message || String(e)
      scenarios.value = []
      selectedScenarioId.value = null
    } finally {
      loading.value = false
    }
  }

  /** @deprecated */
  function updateScenarioMeta(_id, _patch) {
    void load()
  }

  /**
   * @param {string | { name: string, status?: string, enabled?: boolean }} payload
   * @returns {Promise<string>} строковый id для маршрута
   */
  async function addScenario(payload) {
    const p = typeof payload === 'string' ? { name: payload } : payload
    const name = String(p?.name || '').trim() || 'Новый сценарий'
    const status = p?.status === 'published' ? 'published' : 'draft'
    const enabled = p?.enabled !== false
    const res = await $fetch('/api/ote/automation-scenarios', {
      method: 'POST',
      credentials: 'include',
      body: {
        name,
        status,
        enabled,
        graph: { nodes: [], edges: [] },
      },
    })
    const id = res?.scenario?.id
    if (!Number.isFinite(Number(id))) {
      throw new Error('Не удалось создать сценарий')
    }
    await load()
    return String(id)
  }

  /**
   * @param {number} id
   * @param {{ name?: string, status?: string, enabled?: boolean }} patch
   */
  async function patchScenario(id, patch) {
    const body = {}
    if (patch.name != null) body.name = patch.name
    if (patch.status != null) body.status = patch.status
    if (patch.enabled !== undefined) body.enabled = Boolean(patch.enabled)
    await $fetch(`/api/ote/automation-scenarios/${id}`, {
      method: 'PUT',
      credentials: 'include',
      body,
    })
    await load()
  }

  async function deleteScenario(id) {
    await $fetch(`/api/ote/automation-scenarios/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    await load()
  }

  async function persistList() {
    await load()
  }

  return {
    scenarios,
    selectedScenarioId,
    loading,
    error,
    load,
    persistList,
    updateScenarioMeta,
    addScenario,
    patchScenario,
    deleteScenario,
  }
}
