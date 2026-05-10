/**
 * Демо-граф для `/automation/tutorial` (не сохраняется в БД).
 */
import { AUTOMATION_BUILDER_TUTORIAL_NODE_ANCHORS } from '~/tours/automation/workflow-builder-tour-data.js'

const A = AUTOMATION_BUILDER_TUTORIAL_NODE_ANCHORS

/** @type {{ nodes: unknown[], edges: unknown[] }} */
export const AUTOMATION_TUTORIAL_SAMPLE_GRAPH = {
  nodes: [
    {
      id: 'b-1',
      type: 'autoBlock',
      position: { x: 32, y: 96 },
      data: {
        kind: 'trigger',
        variant: 'schedule',
        iconKey: 'CalendarClock',
        title: 'Запуск по расписанию',
        subtitle: 'Календарные дни · Пн–Пт · в 09:00',
        tutorialTourAnchor: A.trigger,
        config: {
          dayMode: 'calendar',
          weekdays: [1, 2, 3, 4, 5],
          times: ['09:00'],
          timezone: '',
        },
      },
    },
    {
      id: 'b-2',
      type: 'autoBlock',
      position: { x: 360, y: 72 },
      data: {
        kind: 'condition',
        variant: 'if_else',
        iconKey: 'GitBranch',
        title: 'ВМ уже запущены?',
        subtitle: 'Автор: мои · состояние: запущены',
        tutorialTourAnchor: A.condition,
        config: {
          blockTitle: 'ВМ уже запущены?',
          authorScope: 'mine',
          tagScope: 'any',
          tagValue: '',
          machinePredicate: 'running',
        },
      },
    },
    {
      id: 'b-3',
      type: 'autoBlock',
      position: { x: 688, y: 32 },
      data: {
        kind: 'action',
        variant: 'stop_mine',
        iconKey: 'PowerOff',
        title: 'Остановить мои ВМ',
        subtitle: 'Мягкое выключение подходящих ВМ',
        tutorialTourAnchor: A.actionStop,
      },
    },
    {
      id: 'b-4',
      type: 'autoBlock',
      position: { x: 688, y: 208 },
      data: {
        kind: 'action',
        variant: 'notify_bell',
        iconKey: 'Bell',
        title: 'Уведомление в колокольчик',
        subtitle: 'Уведомление: стенд ещё выключен',
        tutorialTourAnchor: A.actionNotify,
        config: {
          title: 'Стенд ещё выключен',
          body: 'Условие «нет запущенных ВМ» — можно запускать цепочку.',
        },
      },
    },
  ],
  edges: [
    {
      id: 'e-d1',
      source: 'b-1',
      target: 'b-2',
      type: 'automationDeletable',
      animated: true,
      style: { stroke: '#64748b', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', width: 18, height: 18, color: '#64748b' },
    },
    {
      id: 'e-d2',
      source: 'b-2',
      sourceHandle: 'yes',
      target: 'b-3',
      type: 'automationDeletable',
      animated: true,
      style: { stroke: '#64748b', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', width: 18, height: 18, color: '#64748b' },
    },
    {
      id: 'e-d3',
      source: 'b-2',
      sourceHandle: 'no',
      target: 'b-4',
      type: 'automationDeletable',
      animated: true,
      style: { stroke: '#64748b', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', width: 18, height: 18, color: '#64748b' },
    },
  ],
}
