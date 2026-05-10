/**
 * Разметка и селекторы для тура редактора автоматизаций (песочница).
 * Импорт из продакшен-компонентов допустим: здесь только строковые константы, без driver.js.
 */

/** Значения атрибута data-tour на разметке билдера в режиме песочницы */
export const AUTOMATION_WORKFLOW_BUILDER_TOUR_ATTRS = {
  palette: 'tour-automation-palette',
  paletteFilter: 'tour-automation-palette-filter',
  paletteList: 'tour-automation-palette-list',
  flowCanvas: 'tour-automation-flow-canvas',
}

/** Якоря data-tutorial на узлах демо-графа (совпадают с шагами тура). */
export const AUTOMATION_BUILDER_TUTORIAL_NODE_ANCHORS = {
  trigger: 'tour-demo-trigger',
  condition: 'tour-demo-condition',
  actionStop: 'tour-demo-action-stop',
  actionNotify: 'tour-demo-action-notify',
}

export function automationWorkflowDataTourSelector(attrValue) {
  return `[data-tour="${attrValue}"]`
}

export function automationWorkflowDataTutorialSelector(anchor) {
  return `[data-tutorial="${anchor}"]`
}

/** Класс корня Vue Flow в билдере + производные селекторы для driver.js */
export const AUTOMATION_WORKFLOW_FLOW_DOM = {
  minimap: '.automation-flow .vue-flow__minimap',
  controls: '.automation-flow .vue-flow__controls',
}
