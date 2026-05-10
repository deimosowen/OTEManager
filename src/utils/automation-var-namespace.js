/**
 * Единое имя пространства переменных для узла графа (совпадает с сервером при сохранении сценария).
 * Пример: узел id `b-12` → ключ `b_12`, подстановка `{{ b_12.teamCityBuildId }}`.
 *
 * @param {unknown} nodeId id узла Vue Flow
 */
export function automationVarNamespaceFromNodeId(nodeId) {
  let s = String(nodeId ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!s) return '_node'
  if (/^\d/.test(s)) s = `_${s}`
  return s.slice(0, 48)
}
