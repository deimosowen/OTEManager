/**
 * Валидация графа сценариев автоматизации (узлы Vue Flow + рёбра).
 * Используется на клиенте (при соединении) и на сервере при сохранении.
 */

export const AUTOMATION_GRAPH_LIMITS = {
  maxNodes: 80,
  maxEdges: 160,
}

/** @type {Record<string, Set<string>>} */
export const AUTOMATION_VARIANTS_BY_KIND = {
  trigger: new Set(['schedule', 'manual']),
  condition: new Set(['if_else']),
  action: new Set(['start_mine', 'stop_mine', 'notify_bell', 'create_template', 'power_all_tag']),
  wait: new Set(['teamcity_build']),
}

/** Действия, после выполнения которых есть сборка TeamCity (к блоку «Ожидание» — только отсюда). */
export const AUTOMATION_TEAMCITY_BUILD_ACTION_VARIANTS = new Set([
  'create_template',
  'start_mine',
  'stop_mine',
])

/**
 * @param {import('@vue-flow/core').Node | undefined} node
 */
export function automationNodeProducesTeamCityBuild(node) {
  const k = nodeKind(node)
  const v = nodeVariant(node)
  return k === 'action' && AUTOMATION_TEAMCITY_BUILD_ACTION_VARIANTS.has(v)
}

const KINDS = new Set(['trigger', 'condition', 'action', 'wait'])

/**
 * Связь, у которой оба конца существуют в текущем наборе узлов (нет «осиротевших» рёбер после удаления блока).
 * @param {{ source?: unknown, target?: unknown }} e
 * @param {Set<string>} nodeIds
 */
export function automationEdgeHasBothEndpoints(e, nodeIds) {
  const s = String(e?.source ?? '')
  const t = String(e?.target ?? '')
  return Boolean(s && t && nodeIds.has(s) && nodeIds.has(t))
}

/**
 * @param {unknown} nodes
 * @param {unknown} edges
 * @returns {{ nodes: import('@vue-flow/core').Node[], edges: import('@vue-flow/core').Edge[] } | null}
 */
export function coerceAutomationGraph(nodes, edges) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return null
  return { nodes: /** @type {import('@vue-flow/core').Node[]} */ (nodes), edges: /** @type {import('@vue-flow/core').Edge[]} */ (edges) }
}

/**
 * @param {import('@vue-flow/core').Node[]} nodes
 * @param {import('@vue-flow/core').Edge[]} edges
 */
export function graphHasCycle(nodes, edges) {
  const ids = new Set(nodes.map((n) => String(n.id)))
  /** @type {Map<string, string[]>} */
  const adj = new Map()
  for (const id of ids) adj.set(id, [])
  for (const e of edges) {
    const s = String(e.source || '')
    const t = String(e.target || '')
    if (!ids.has(s) || !ids.has(t)) continue
    adj.get(s)?.push(t)
  }

  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  /** @type {Map<string, number>} */
  const color = new Map()
  for (const id of ids) color.set(id, WHITE)

  function dfs(u) {
    color.set(u, GRAY)
    for (const v of adj.get(u) || []) {
      const c = color.get(v)
      if (c === GRAY) return true
      if (c === WHITE && dfs(v)) return true
    }
    color.set(u, BLACK)
    return false
  }

  for (const id of ids) {
    if (color.get(id) === WHITE && dfs(id)) return true
  }
  return false
}

/**
 * @param {import('@vue-flow/core').Node | undefined} node
 */
function nodeKind(node) {
  const k = node?.data?.kind
  return typeof k === 'string' ? k : ''
}

/**
 * @param {import('@vue-flow/core').Node | undefined} node
 */
function nodeVariant(node) {
  const v = node?.data?.variant
  return typeof v === 'string' ? v : ''
}

/**
 * Полная проверка графа перед сохранением на сервере.
 * @param {unknown} nodesRaw
 * @param {unknown} edgesRaw
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateAutomationGraph(nodesRaw, edgesRaw) {
  const errors = []
  const coerced = coerceAutomationGraph(nodesRaw, edgesRaw)
  if (!coerced) {
    return { ok: false, errors: ['Ожидаются массивы nodes и edges'] }
  }
  const { nodes, edges } = coerced

  if (nodes.length > AUTOMATION_GRAPH_LIMITS.maxNodes) {
    errors.push(`Слишком много блоков (максимум ${AUTOMATION_GRAPH_LIMITS.maxNodes})`)
  }
  if (edges.length > AUTOMATION_GRAPH_LIMITS.maxEdges) {
    errors.push(`Слишком много связей (максимум ${AUTOMATION_GRAPH_LIMITS.maxEdges})`)
  }

  const idSet = new Set()
  for (const n of nodes) {
    const id = n && n.id != null ? String(n.id) : ''
    if (!id) {
      errors.push('У блока отсутствует id')
      continue
    }
    if (idSet.has(id)) errors.push(`Дубликат id блока: ${id}`)
    idSet.add(id)
    const typ = String(n.type || '')
    if (typ !== 'autoBlock') errors.push(`Блок ${id}: ожидается type "autoBlock"`)
    const kind = nodeKind(n)
    if (!KINDS.has(kind)) {
      errors.push(`Блок ${id}: неизвестный kind`)
      continue
    }
    const allowed = AUTOMATION_VARIANTS_BY_KIND[kind]
    const variant = nodeVariant(n)
    if (!allowed.has(variant)) {
      errors.push(`Блок ${id}: неизвестная комбинация kind/variant`)
    }
  }

  const edgeKey = (e) =>
    `${String(e.source)}|${String(e.target)}|${e.sourceHandle ?? ''}|${e.targetHandle ?? ''}`

  const seenEdge = new Set()
  for (const e of edges) {
    const src = String(e.source || '')
    const tgt = String(e.target || '')
    if (!src || !tgt) {
      errors.push('Связь без source или target')
      continue
    }
    if (!idSet.has(src)) errors.push(`Связь: неизвестный source ${src}`)
    if (!idSet.has(tgt)) errors.push(`Связь: неизвестный target ${tgt}`)
    if (src === tgt) errors.push(`Петля запрещена: ${src}`)
    const k = edgeKey(e)
    if (seenEdge.has(k)) errors.push('Дубликат связи с теми же концами и портами')
    seenEdge.add(k)
  }

  /** @type {Map<string, import('@vue-flow/core').Node>} */
  const byId = new Map(nodes.map((n) => [String(n.id), n]))

  for (const e of edges) {
    const src = String(e.source || '')
    const tgt = String(e.target || '')
    const sn = byId.get(src)
    const tn = byId.get(tgt)
    if (!sn || !tn) continue

    if (nodeKind(tn) === 'trigger') {
      errors.push('Нельзя подключать связь к триггеру')
    }

    const sk = nodeKind(sn)
    const tk = nodeKind(tn)

    if (tk === 'wait' && !automationNodeProducesTeamCityBuild(sn)) {
      errors.push(
        `Ожидание ${tgt}: входящая связь допустима только от блока, который ставит сборку в TeamCity`,
      )
    }

    if (sk === 'condition') {
      const h = e.sourceHandle != null ? String(e.sourceHandle) : ''
      if (h !== 'yes' && h !== 'no') {
        errors.push(`Условие ${src}: исходящая связь должна идти из ветки «Да» или «Нет»`)
      }
    } else if (sk === 'wait') {
      const h = e.sourceHandle != null ? String(e.sourceHandle) : ''
      if (h !== 'success' && h !== 'failure') {
        errors.push(`Ожидание ${src}: исходящая связь должна идти из «Успешно» или «Ошибка»`)
      }
    } else {
      if (e.sourceHandle != null && String(e.sourceHandle) !== '') {
        errors.push(`Блок ${src}: лишний исходящий порт (ветки бывают только у условий и ожидания TeamCity)`)
      }
    }
  }

  for (const n of nodes) {
    const id = String(n.id)
    if (nodeKind(n) === 'condition') {
      for (const h of ['yes', 'no']) {
        const branchEdges = edges.filter(
          (x) =>
            String(x.source) === id &&
            String(x.sourceHandle || '') === h &&
            idSet.has(String(x.target)),
        )
        if (branchEdges.length > 1) errors.push(`Условие ${id}: ветка «${h}» продублирована`)
      }
    } else if (nodeKind(n) === 'wait') {
      for (const h of ['success', 'failure']) {
        const branchEdges = edges.filter(
          (x) =>
            String(x.source) === id &&
            String(x.sourceHandle || '') === h &&
            idSet.has(String(x.target)),
        )
        if (branchEdges.length > 1) errors.push(`Ожидание ${id}: ветка «${h}» продублирована`)
      }
    }
  }

  const incomers = new Map()
  for (const id of idSet) incomers.set(id, 0)
  for (const e of edges) {
    const src = String(e.source || '')
    const tgt = String(e.target || '')
    if (!idSet.has(src) || !idSet.has(tgt)) continue
    if (incomers.has(tgt)) incomers.set(tgt, (incomers.get(tgt) || 0) + 1)
  }
  for (const n of nodes) {
    if (nodeKind(n) === 'trigger' && (incomers.get(String(n.id)) || 0) > 0) {
      errors.push(`Триггер ${n.id}: не должно быть входящих связей`)
    }
  }

  if (edges.length && graphHasCycle(nodes, edges)) {
    errors.push('В графе есть цикл — такой сценарий нельзя выполнить надёжно')
  }

  const uniq = [...new Set(errors)]
  return { ok: uniq.length === 0, errors: uniq }
}

/**
 * Vue Flow/DOM иногда отдаёт пустой идентификатор порта как '', строку "null" или undefined — для правил графа это «нет порта».
 * @param {unknown} h
 * @returns {string | null}
 */
export function normalizeVueFlowHandle(h) {
  if (h == null) return null
  const s = String(h).trim()
  if (s === '' || s === 'null' || s === 'undefined') return null
  return s
}

/** Ключ для сравнения «та же связь», с нормализацией портов. */
export function automationConnectionSignature(e) {
  const sh = normalizeVueFlowHandle(e?.sourceHandle)
  const th = normalizeVueFlowHandle(e?.targetHandle)
  return `${String(e?.source ?? '')}|${String(e?.target ?? '')}|${sh ?? ''}|${th ?? ''}`
}

/**
 * Сводит несколько снимков nodes/edges (ctx Vue Flow и v-model) без дубликатов по id / сигнатуре связи.
 */
export function mergeAutomationNodesForValidation(nodeLists) {
  /** @type {Map<string, import('@vue-flow/core').Node>} */
  const m = new Map()
  for (const list of nodeLists) {
    if (!Array.isArray(list)) continue
    for (const n of list) {
      if (n && n.id != null) m.set(String(n.id), n)
    }
  }
  return [...m.values()]
}

export function mergeAutomationEdgesForValidation(edgeLists) {
  /** @type {Map<string, import('@vue-flow/core').Edge>} */
  const m = new Map()
  for (const list of edgeLists) {
    if (!Array.isArray(list)) continue
    for (const e of list) {
      m.set(automationConnectionSignature(e), e)
    }
  }
  return [...m.values()]
}

/**
 * Приводит пару source/target к семантике «поток идёт от source к target» для наших блоков.
 * Vue Flow при части жестов отдаёт связь так, что триггер оказывается в `target`, хотя линия тянули от триггера к действию.
 * @param {{ source?: unknown, target?: unknown, sourceHandle?: unknown, targetHandle?: unknown }} conn
 * @param {import('@vue-flow/core').Node[]} nodes
 */
export function normalizeAutomationConnectionForFlow(conn, nodes) {
  let source = String(conn?.source ?? '')
  let target = String(conn?.target ?? '')
  let sourceHandle = normalizeVueFlowHandle(conn?.sourceHandle ?? null)
  let targetHandle = normalizeVueFlowHandle(conn?.targetHandle ?? null)

  const byId = new Map(nodes.map((n) => [String(n.id), n]))
  const sn = byId.get(source)
  const tn = byId.get(target)

  if (
    sn &&
    tn &&
    nodeKind(tn) === 'trigger' &&
    nodeKind(sn) !== 'trigger'
  ) {
    ;[source, target] = [target, source]
    const sh = sourceHandle
    sourceHandle = targetHandle
    targetHandle = sh
  }

  return { source, target, sourceHandle, targetHandle }
}

/**
 * Проверка одной новой связи (в UI до добавления ребра).
 * @param {{ source: string, target: string, sourceHandle?: string | null, targetHandle?: string | null }} conn
 * @param {import('@vue-flow/core').Node[]} nodes
 * @param {import('@vue-flow/core').Edge[]} edges
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateAutomationConnection(conn, nodes, edges) {
  const norm = normalizeAutomationConnectionForFlow(conn, nodes)
  const source = norm.source
  const target = norm.target
  if (!source || !target) return { ok: false, reason: 'Некорректное соединение' }
  if (source === target) return { ok: false, reason: 'Нельзя соединять блок сам с собой' }

  const byId = new Map(nodes.map((n) => [String(n.id), n]))
  const sn = byId.get(source)
  const tn = byId.get(target)
  if (!sn) return { ok: false, reason: 'Неизвестный исходной блок' }
  if (!tn) return { ok: false, reason: 'Неизвестный целевой блок' }

  if (nodeKind(tn) === 'trigger') return { ok: false, reason: 'Нельзя вести связь к триггеру' }

  const nodeIds = new Set(nodes.map((n) => String(n.id)))
  const cleanEdges = edges.filter((e) => automationEdgeHasBothEndpoints(e, nodeIds))

  const sk = nodeKind(sn)
  const tk = nodeKind(tn)

  if (tk === 'wait' && !automationNodeProducesTeamCityBuild(sn)) {
    return {
      ok: false,
      reason: 'К «Ожиданию TeamCity» подключайте только блок с постановкой сборки в TeamCity',
    }
  }

  if (sk === 'condition') {
    const h = norm.sourceHandle != null ? String(norm.sourceHandle) : ''
    if (h !== 'yes' && h !== 'no') {
      return { ok: false, reason: 'Выберите выход «Да» или «Нет» у условия' }
    }
    const taken = cleanEdges.some((e) => {
      if (String(e.source) !== source) return false
      return normalizeVueFlowHandle(e.sourceHandle) === h
    })
    if (taken) return { ok: false, reason: 'Эта ветка условия уже подключена' }
  } else if (sk === 'wait') {
    const h = norm.sourceHandle != null ? String(norm.sourceHandle) : ''
    if (h !== 'success' && h !== 'failure') {
      return { ok: false, reason: 'Выберите выход «Успешно» или «Ошибка» у ожидания TeamCity' }
    }
    const taken = cleanEdges.some((e) => {
      if (String(e.source) !== source) return false
      return normalizeVueFlowHandle(e.sourceHandle) === h
    })
    if (taken) return { ok: false, reason: 'Эта ветка ожидания уже подключена' }
  } else if (normalizeVueFlowHandle(norm.sourceHandle) != null) {
    return { ok: false, reason: 'У этого блока один выход — используйте основной порт' }
  }

  const tentativeSig = automationConnectionSignature({
    source,
    target,
    sourceHandle: norm.sourceHandle,
    targetHandle: norm.targetHandle,
  })
  const dup = cleanEdges.some((e) => automationConnectionSignature(e) === tentativeSig)
  if (dup) return { ok: false, reason: 'Такая связь уже есть' }

  const tentative = [
    ...cleanEdges,
    {
      id: `__tentative__`,
      source,
      target,
      sourceHandle: norm.sourceHandle ?? undefined,
      targetHandle: norm.targetHandle ?? undefined,
    },
  ]

  if (graphHasCycle(nodes, tentative)) {
    return { ok: false, reason: 'Эта связь замкнёт цикл в сценарии' }
  }

  return { ok: true }
}
