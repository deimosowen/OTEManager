import { normalizeManualHomeConfig } from '@app-constants/automation-manual-home.js'

/**
 * Кнопки главной из узлов «Ручной запуск» графа сценария.
 * @param {number} scenarioId
 * @param {unknown} graph
 * @returns {{ scenarioId: number, nodeId: string, label: string, variant: string, iconKey: string }[]}
 */
export function extractManualLaunchButtonsFromGraph(scenarioId, graph) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : []
  /** @type {{ scenarioId: number, nodeId: string, label: string, variant: string, iconKey: string }[]} */
  const out = []
  for (const n of nodes) {
    const d = n?.data
    if (!d || d.kind !== 'trigger' || d.variant !== 'manual') continue
    const cfg = normalizeManualHomeConfig(d.config)
    const b = cfg.buttons[0]
    if (!b) continue
    const nodeId = String(n.id ?? '').trim()
    if (!nodeId) continue
    out.push({
      scenarioId,
      nodeId,
      label: b.label,
      variant: b.variant,
      iconKey: b.iconKey,
    })
  }
  return out
}
