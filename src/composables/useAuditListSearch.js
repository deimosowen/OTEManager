import { ref, watch } from 'vue'
import { AUDIT_SEARCH_DEBOUNCE_MS } from '~/constants/audit'

/**
 * Строка ввода и применённый поиск: debounce; при очистке поля — сразу.
 * @param {() => void} onCommitted — сбросить страницу на 1 и вызвать load в родителе
 */
export function useAuditListSearch(onCommitted) {
  const searchDraft = ref('')
  const searchQuery = ref('')
  let timer = null

  function clearTimer() {
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
  }

  watch(searchDraft, () => {
    clearTimer()
    const t = String(searchDraft.value).trim()
    if (!t) {
      if (searchQuery.value !== '') {
        searchQuery.value = ''
        onCommitted()
      }
      return
    }
    timer = setTimeout(() => {
      timer = null
      searchQuery.value = t
      onCommitted()
    }, AUDIT_SEARCH_DEBOUNCE_MS)
  })

  function resetSearch() {
    clearTimer()
    searchDraft.value = ''
    searchQuery.value = ''
  }

  return { searchDraft, searchQuery, resetSearch }
}
