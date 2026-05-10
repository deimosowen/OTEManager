import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import {
  AUTOMATION_BUILDER_TUTORIAL_NODE_ANCHORS,
  AUTOMATION_WORKFLOW_BUILDER_TOUR_ATTRS,
  AUTOMATION_WORKFLOW_FLOW_DOM,
  automationWorkflowDataTourSelector,
  automationWorkflowDataTutorialSelector,
} from '~/tours/automation/workflow-builder-tour-data.js'

const T = AUTOMATION_WORKFLOW_BUILDER_TOUR_ATTRS
const N = AUTOMATION_BUILDER_TUTORIAL_NODE_ANCHORS

/**
 * Пошаговый тур по редактору графа (driver.js). Страница `/automation/tutorial`.
 *
 * @param {{ onTourEnded?: (p: { finished: boolean }) => void | Promise<void> }} [hooks]
 */
export function runAutomationBuilderTutorialTour(hooks = {}) {
  if (!import.meta.client) return

  let finishedWithTour = false

  const steps = /** @type {import('driver.js').DriveStep[]} */ ([
    {
      popover: {
        title: 'Редактор сценария',
        description:
          'Слева — палитра типов блоков, справа — холст. Дальше по шагам покажем интерфейс на готовом примере: это демонстрация, граф песочницы на сервер не сохраняется.',
        side: 'over',
        align: 'center',
      },
    },
    {
      element: automationWorkflowDataTourSelector(T.palette),
      popover: {
        title: 'Палитра',
        description:
          'Заголовок и подсказка напоминают назначение. Ниже фильтр по типу блоков и прокручиваемый список.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: automationWorkflowDataTourSelector(T.paletteFilter),
      popover: {
        title: 'Фильтр «Показать»',
        description: 'Переключайте триггеры, условия, ожидание и действия — список кнопок под фильтром обновится.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: automationWorkflowDataTourSelector(T.paletteList),
      popover: {
        title: 'Добавить блок',
        description:
          'Потяните строку на холст (drag-and-drop): блок появится в точке отпускания. Или кликните по строке — блок добавится в центр области (для типов с настройками откроется модалка).',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: automationWorkflowDataTourSelector(T.flowCanvas),
      popover: {
        title: 'Холст',
        description:
          'Перетаскивайте узлы за карточку. Колёсико мыши — масштаб; перетаскивание по пустому месту — сдвиг вида. От ручки выхода одного блока тяните линию к входу другого, чтобы создать связь.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: automationWorkflowDataTutorialSelector(N.trigger),
      popover: {
        title: 'Триггер',
        description:
          'Точка входа сценария. От триггера может идти одна или несколько связей — ветки выполняются параллельно.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: automationWorkflowDataTutorialSelector(N.condition),
      popover: {
        title: 'Условие If / Else',
        description:
          'Два выхода: «Да» и «Нет». Подключайте разные следующие блоки к верхней и нижней ручке справа.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: automationWorkflowDataTutorialSelector(N.actionStop),
      popover: {
        title: 'Ветка «Да»',
        description:
          'Пример действия в одной из веток условия. У действий один выход справа (если нужна цепочка дальше).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: automationWorkflowDataTutorialSelector(N.actionNotify),
      popover: {
        title: 'Ветка «Нет»',
        description: 'Вторая ветка от того же условия — другой сценарий при противоположном результате проверки.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: AUTOMATION_WORKFLOW_FLOW_DOM.minimap,
      popover: {
        title: 'Мини-карта',
        description: 'Обзор всего графа; можно перетаскивать прямоугольник вида и кликать для быстрого перехода.',
        side: 'left',
        align: 'end',
      },
    },
    {
      element: AUTOMATION_WORKFLOW_FLOW_DOM.controls,
      popover: {
        title: 'Масштаб',
        description: 'Кнопки приближения и отдаления и подгонка под содержимое. Удобно после ручного зума колёсиком.',
        side: 'top',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'Связи, правки и клавиши',
        description:
          'У связи на линии есть действие удаления; при выделенной связи сработает Del или Backspace. У узла — иконки «настройки» и «удалить» при наведении; двойной клик по карточке тоже открывает настройки, если они есть. Кнопки «Сбросить демо» и «Очистить холст» — в шапке справа.',
        side: 'over',
        align: 'center',
      },
    },
    {
      popover: {
        title: 'Готово',
        description:
          'Создайте настоящий сценарий в списке «Автоматизации»: там граф сохраняется и доступен запуску по правилам.',
        side: 'over',
        align: 'center',
      },
    },
  ])

  /** @type {import('driver.js').Driver} */
  let d

  d = driver({
    steps,
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.74,
    overlayColor: '#0f172a',
    disableActiveInteraction: true,
    allowKeyboardControl: true,
    popoverOffset: 12,
    stagePadding: 8,
    nextBtnText: 'Далее',
    prevBtnText: 'Назад',
    doneBtnText: 'Готово',
    progressText: '{{current}} из {{total}}',
    popoverClass: 'driver-popover-ote-font',
    onNextClick() {
      const i = d.getActiveIndex()
      if (i === undefined) return
      if (d.isLastStep()) finishedWithTour = true
      d.moveNext()
      requestAnimationFrame(() => d.refresh())
    },
    onPrevClick() {
      d.movePrevious()
      requestAnimationFrame(() => d.refresh())
    },
    onDestroyed() {
      void hooks.onTourEnded?.({ finished: finishedWithTour })
    },
  })

  requestAnimationFrame(() => {
    d.drive()
    d.refresh()
  })
}
