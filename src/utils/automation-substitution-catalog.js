import { automationVarNamespaceFromNodeId } from './automation-var-namespace.js'

/**
 * Поля, которые блок может отдавать в контекст выполнения (для UI подстановок).
 * Ключи совпадают с полями merge на сервере.
 *
 * @type {Record<string, { key: string, label: string }[]>}
 */
export const AUTOMATION_OUTPUT_FIELDS_BY_VARIANT = {
  if_else: [
    { key: 'branch', label: 'Ветка' },
    { key: 'matched', label: 'Условие да/нет' },
    { key: 'tagValue', label: 'Тег' },
    { key: 'tagScope', label: 'Область тега' },
    { key: 'authorScope', label: 'Чьи среды' },
    { key: 'machinePredicate', label: 'Условие по ВМ' },
  ],
  create_template: [
    { key: 'ok', label: 'Успех' },
    { key: 'creationId', label: 'ID создания' },
    { key: 'teamCityBuildId', label: 'Сборка TeamCity' },
    { key: 'error', label: 'Ошибка' },
  ],
  http_request: [
    { key: 'ok', label: 'HTTP успех' },
    { key: 'status', label: 'Код ответа' },
    { key: 'statusText', label: 'Текст статуса' },
    { key: 'bodyText', label: 'Тело ответа' },
    { key: 'json', label: 'JSON' },
    { key: 'error', label: 'Ошибка' },
  ],
  start_mine: [
    { key: 'ok', label: 'Успех операции' },
    { key: 'teamCityBuildIds', label: 'Сборки TC' },
    { key: 'steps', label: 'Число шагов' },
    { key: 'targetMode', label: 'Режим (mine/tag)' },
    { key: 'resolvedTag', label: 'Имя среды' },
    { key: 'error', label: 'Ошибка' },
    { key: 'tagMatched', label: 'Среда найдена' },
  ],
  stop_mine: [
    { key: 'ok', label: 'Успех операции' },
    { key: 'teamCityBuildIds', label: 'Сборки TC' },
    { key: 'steps', label: 'Число шагов' },
    { key: 'targetMode', label: 'Режим (mine/tag)' },
    { key: 'resolvedTag', label: 'Имя среды' },
    { key: 'error', label: 'Ошибка' },
    { key: 'tagMatched', label: 'Среда найдена' },
  ],
}

/**
 * Все предки узла `targetNodeId` по рёбрам (кто достижим вверх по потоку).
 *
 * @param {import('@vue-flow/core').Edge[]} edges
 * @param {string} targetNodeId
 * @returns {string[]}
 */
export function collectUpstreamNodeIds(edges, targetNodeId) {
  const t0 = String(targetNodeId || '').trim()
  if (!t0) return []
  /** @type {Set<string>} */
  const seen = new Set()
  /** @type {string[]} */
  const queue = [t0]
  while (queue.length) {
    const t = queue.shift()
    for (const e of edges || []) {
      if (String(e.target || '') !== t) continue
      const s = String(e.source || '').trim()
      if (!s || seen.has(s)) continue
      seen.add(s)
      queue.push(s)
    }
  }
  return [...seen]
}

/**
 * @param {import('@vue-flow/core').Node[]} nodes
 * @param {import('@vue-flow/core').Edge[]} edges
 * @param {string | null | undefined} targetNodeId узел, для которого открыта модалка (куда «приходят» связи)
 * @returns {{ nodeId: string, variant: string, title: string, ns: string, fields: { key: string, label: string, snippet: string }[] }[]}
 */
export function buildUpstreamSubstitutionGroups(nodes, edges, targetNodeId) {
  const ids = collectUpstreamNodeIds(edges, targetNodeId)
  const byId = new Map(nodes.map((n) => [String(n.id), n]))
  /** @type {{ nodeId: string, variant: string, title: string, ns: string, fields: { key: string, label: string, snippet: string }[] }[]} */
  const out = []
  for (const id of ids) {
    const n = byId.get(id)
    const variant = String(n?.data?.variant || '')
    const fields = AUTOMATION_OUTPUT_FIELDS_BY_VARIANT[variant]
    if (!fields?.length) continue
    const ns = automationVarNamespaceFromNodeId(id)
    const title = String(n?.data?.title || variant || id).trim() || id
    out.push({
      nodeId: id,
      variant,
      title,
      ns,
      fields: fields.map((f) => ({
        ...f,
        snippet: `{{ ${ns}.${f.key} }}`,
      })),
    })
  }
  return out
}
