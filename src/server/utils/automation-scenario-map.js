/**
 * @param {typeof import('../db/schema.js').oteAutomationScenarios.$inferSelect} row
 */
export function mapAutomationScenarioSummary(row) {
  const en = row.enabled
  return {
    id: row.id,
    groupId: row.groupId,
    name: row.name,
    status: row.status,
    enabled: en === undefined || en === null ? true : Number(en) !== 0,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : Number(row.updatedAt),
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt),
  }
}

/**
 * @param {typeof import('../db/schema.js').oteAutomationScenarios.$inferSelect} row
 */
export function mapAutomationScenarioFull(row) {
  let graph = { nodes: [], edges: [] }
  try {
    const parsed = JSON.parse(String(row.graphJson || '{}'))
    if (parsed && typeof parsed === 'object') {
      graph = {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      }
    }
  } catch {
    graph = { nodes: [], edges: [] }
  }
  return {
    ...mapAutomationScenarioSummary(row),
    graph,
  }
}
