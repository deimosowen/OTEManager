import { reactive } from 'vue'

/**
 * Кнопки ручного запуска на главной (блок «Рабочий стол OTE»).
 * Источник истины — сервер: `/api/me/automation-manual-launch` (только включённые сценарии).
 * Список обновляют через `loadManualLaunchPanelFromApi` после сохранения графа или смены включённости сценария;
 * на главной дополнительно подгружают при переходе на `/` и при возврате на вкладку браузера.
 */
const manualHomeLaunch = reactive(
  /** @type {{ buttons: { label: string, variant: string, iconKey: string, scenarioId?: number, nodeId?: string }[] }} */ ({
    buttons: [],
  }),
)

/**
 * @param {typeof globalThis.$fetch} fetcher
 */
export async function loadManualLaunchPanelFromApi(fetcher) {
  const f = fetcher || globalThis.$fetch
  if (!f) return
  try {
    const res = await f('/api/me/automation-manual-launch', { credentials: 'include' })
    applyManualHomeLaunchFromServer(res?.buttons || [])
  } catch {
    manualHomeLaunch.buttons.splice(0, manualHomeLaunch.buttons.length)
  }
}

/**
 * @param {unknown[]} rows
 */
export function applyManualHomeLaunchFromServer(rows) {
  const list = Array.isArray(rows) ? rows : []
  /** @type {{ label: string, variant: string, iconKey: string, scenarioId?: number, nodeId?: string }[]} */
  const next = []
  for (const r of list) {
    if (!r || typeof r !== 'object') continue
    const label = String(r.label || '').trim()
    if (!label) continue
    next.push({
      label,
      variant: typeof r.variant === 'string' ? r.variant : 'secondary',
      iconKey: typeof r.iconKey === 'string' ? r.iconKey : '',
      scenarioId: typeof r.scenarioId === 'number' ? r.scenarioId : Number(r.scenarioId) || undefined,
      nodeId: r.nodeId != null ? String(r.nodeId) : undefined,
    })
  }
  manualHomeLaunch.buttons.splice(0, manualHomeLaunch.buttons.length, ...next)
}

export function useManualHomeLaunch() {
  return {
    manualHomeLaunch,
  }
}
