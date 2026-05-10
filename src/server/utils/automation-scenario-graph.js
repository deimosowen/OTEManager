import { validateAutomationGraph } from '@app-utils/automation-graph.js'

/**
 * Парсинг и валидация тела graph для API.
 * @param {unknown} raw
 * @returns {{ nodes: unknown[], edges: unknown[] }}
 */
export function parseAndValidateAutomationGraphBody(raw) {
  if (raw == null) {
    return { nodes: [], edges: [] }
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw createError({ statusCode: 400, message: 'Поле graph должно быть объектом с nodes и edges' })
  }
  const nodes = Array.isArray(raw.nodes) ? raw.nodes : null
  const edges = Array.isArray(raw.edges) ? raw.edges : null
  if (nodes === null || edges === null) {
    throw createError({ statusCode: 400, message: 'В graph нужны массивы nodes и edges' })
  }
  const v = validateAutomationGraph(nodes, edges)
  if (!v.ok) {
    /** Раньше 400; ослаблено — граф сохраняется как есть (конструктор не блокируем). */
    console.warn('[automation-scenario-graph]', v.errors)
  }
  return { nodes, edges }
}
