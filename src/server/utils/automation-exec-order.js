/**
 * Обход графа сценария с ветвлением If/Else: из условия берётся только выбранная ветка (да или нет).
 * Каждый узел попадает в порядок не больше одного раза (слияния после разветвления не дублируют выполнение).
 *
 * @param {string} startId
 * @param {import('@vue-flow/core').Node[]} nodes
 * @param {import('@vue-flow/core').Edge[]} edges
 * @param {(node: import('@vue-flow/core').Node) => Promise<'yes'|'no'>} evaluateIfElseBranch
 * @returns {Promise<string[]>}
 */
export async function collectAutomationExecutionOrder(startId, nodes, edges, evaluateIfElseBranch) {
  const byId = new Map(nodes.map((n) => [String(n.id), n]))

  /**
   * @param {unknown} h
   */
  function sourceHandleNorm(h) {
    if (h == null) return ''
    const s = String(h).trim()
    if (s === '' || s === 'null' || s === 'undefined') return ''
    return s
  }

  /** @type {string[]} */
  const order = []
  const visited = new Set()

  /**
   * @param {string} nodeId
   */
  async function walk(nodeId) {
    const id = String(nodeId)
    if (visited.has(id)) return
    visited.add(id)
    order.push(id)

    const node = byId.get(id)
    const kind = node?.data?.kind
    const variant = node?.data?.variant

    let outs = (edges || []).filter((e) => String(e.source) === id)

    if (kind === 'condition' && variant === 'if_else') {
      const branch = await evaluateIfElseBranch(/** @type {import('@vue-flow/core').Node} */ (node))
      const b = branch === 'no' ? 'no' : 'yes'
      outs = outs.filter((e) => sourceHandleNorm(e.sourceHandle) === b)
    } else {
      outs = outs.filter((e) => !sourceHandleNorm(e.sourceHandle))
    }

    const targets = [...new Set(outs.map((e) => String(e.target)))].sort()
    for (const t of targets) await walk(t)
  }

  await walk(String(startId))
  return order
}
