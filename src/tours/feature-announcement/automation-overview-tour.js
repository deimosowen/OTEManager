import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { nextTick } from 'vue'
import { runAutomationBuilderTutorialTour } from '~/tours/automation/builder-tutorial-tour.js'

/**
 * @param {import('vue-router').Router} router
 * @param {string} path
 * @param {string} [hash]
 * @param {{ extraWaitMs?: number }} [opts]
 */
async function settleRoute(router, path, hash = '', opts = {}) {
  const extraWaitMs = typeof opts.extraWaitMs === 'number' ? opts.extraWaitMs : 0
  const h = hash ? (String(hash).startsWith('#') ? String(hash) : `#${hash}`) : ''
  const cur = router.currentRoute.value
  if (cur.path !== path || (h && cur.hash !== h)) {
    await router.push({ path, hash: h || undefined })
    await nextTick()
    await new Promise((r) => setTimeout(r, 450))
  }
  if (extraWaitMs > 0) await new Promise((r) => setTimeout(r, extraWaitMs))
  if (h && import.meta.client) {
    const id = h.slice(1)
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' })
    await new Promise((r) => setTimeout(r, 120))
  }
}

/** После списка сценариев — холст в песочнице и Vue Flow под ClientOnly. */
const SANDBOX_ROUTE = '/automation/tutorial'

/**
 * Завершающая часть: главная (ручной запуск) и прощание.
 *
 * @param {import('vue-router').Router} router
 * @param {{
 *   onTourEnded?: (payload: { finished: boolean }) => void | Promise<void>
 * }} hooks
 */
function runAutomationHomeHeroTour(router, hooks = {}) {
  let finishedWithTour = false

  const steps = /** @type {import('driver.js').DriveStep[]} */ ([
    {
      element: '[data-tour="tour-home-hero-actions"]',
      popover: {
        title: 'Главная и ручной запуск',
        description:
          'Если в сценарии есть блок «Ручной запуск», после сохранения графа на главной появятся кнопки быстрого старта рядом с основными действиями.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'Готово',
        description: 'Можно создать свой сценарий в «Автоматизации» — граф там сохраняется и участвует в запусках.',
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
      const i = d.getActiveIndex()
      if (i === undefined || i <= 0) return
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

/**
 * Экскурсия: сайдбар и список → песочница редактора (полный тур билдера) → главная → финал.
 *
 * @param {import('vue-router').Router} router
 * @param {{
 *   onTourEnded?: (payload: { finished: boolean }) => void | Promise<void>
 * }} hooks — один раз в самом конце цепочки (или при раннем закрытии до песочницы).
 */
export function runAutomationOverviewTour(router, hooks = {}) {
  let suppressPart1OnDestroyed = false

  const steps = /** @type {import('driver.js').DriveStep[]} */ ([
    {
      element: '[data-tour="tour-sidebar-automation"]',
      popover: {
        title: 'Раздел «Автоматизации»',
        description: 'Здесь список сценариев и переход к редактору цепочки шагов. Нажмите «Далее» — откроем раздел.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="tour-automation-header"]',
      popover: {
        title: 'Сценарии',
        description:
          '«Новый сценарий» открывает параметры и затем редактор графа. Уже созданные строки ведут в тот же редактор.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="tour-automation-about"]',
      popover: {
        title: 'Зачем это нужно',
        description:
          'Один сценарий может запускаться по расписанию, по кнопке на главной (блок «Ручной запуск» в графе) или развиваться цепочкой условий и действий.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="tour-automation-table"]',
      popover: {
        title: 'Дальше — песочница',
        description:
          'Нажмите «Далее»: откроется демонстрационный редактор без сохранения в базу. Мы покажем палитру, перетаскивание, связи между блоками, мини-карту и масштаб на примере графа.',
        side: 'top',
        align: 'start',
      },
    },
  ])

  /** @type {import('driver.js').Driver} */
  let d

  function handoffToSandbox() {
    void settleRoute(router, SANDBOX_ROUTE, '', { extraWaitMs: 650 }).then(() => {
      suppressPart1OnDestroyed = true
      d.destroy()
      suppressPart1OnDestroyed = false

      runAutomationBuilderTutorialTour({
        onTourEnded: ({ finished }) => {
          if (!finished) {
            void hooks.onTourEnded?.({ finished: false })
            return
          }
          void settleRoute(router, '/').then(() => {
            runAutomationHomeHeroTour(router, hooks)
          })
        },
      })
    })
  }

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
    doneBtnText: 'Далее',
    progressText: '{{current}} из {{total}}',
    popoverClass: 'driver-popover-ote-font',
    onNextClick() {
      const i = d.getActiveIndex()
      if (i === undefined) return

      if (i === 3) {
        handoffToSandbox()
        return
      }

      const nav =
        i === 0 ? { path: '/automation' } : undefined
      if (nav) {
        void settleRoute(router, nav.path, nav.hash).then(() => {
          d.moveNext()
          d.refresh()
        })
      } else {
        d.moveNext()
        d.refresh()
      }
    },
    onPrevClick() {
      const i = d.getActiveIndex()
      if (i === undefined || i <= 0) return

      if (i === 1) {
        void settleRoute(router, '/').then(() => {
          d.movePrevious()
          d.refresh()
        })
        return
      }

      d.movePrevious()
      d.refresh()
    },
    onDestroyed() {
      if (suppressPart1OnDestroyed) return
      void hooks.onTourEnded?.({ finished: false })
    },
  })

  void settleRoute(router, '/', '').then(() => {
    d.drive()
    d.refresh()
  })
}
