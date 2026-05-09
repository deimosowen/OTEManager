import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { nextTick } from 'vue'

/** Отложить предложение оффера до закрытия вкладки. */
export const ONBOARDING_OFFER_POSTPONE_SESSION_KEY = 'ote:onboarding-offer-postponed'

export function postponeOnboardingOfferForSession() {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(ONBOARDING_OFFER_POSTPONE_SESSION_KEY, '1')
  } catch {
    /* quota / private mode */
  }
}

export function isOnboardingOfferPostponedSession() {
  if (!import.meta.client) return false
  try {
    return sessionStorage.getItem(ONBOARDING_OFFER_POSTPONE_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * @param {import('vue-router').Router} router
 * @param {string} path
 * @param {string} [hash] без ведущего # или с ним
 */
async function settleRoute(router, path, hash) {
  const h = hash ? (String(hash).startsWith('#') ? String(hash) : `#${hash}`) : ''
  const cur = router.currentRoute.value
  if (cur.path !== path || (h && cur.hash !== h)) {
    await router.push({ path, hash: h || undefined })
    await nextTick()
    await new Promise((r) => setTimeout(r, 450))
  }
  if (h && import.meta.client) {
    const id = h.slice(1)
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' })
    await new Promise((r) => setTimeout(r, 120))
  }
}

/** Индекс текущего шага → куда перейти перед следующим (кнопка «Далее»). */
const NAV_BEFORE_NEXT = {
  2: { path: '/environments' },
  4: { path: '/create' },
  8: { path: '/profile', hash: '#profile-teamcity' },
  9: { path: '/' },
  10: { path: '/' },
}

/** Индекс текущего шага → куда перейти перед предыдущим (кнопка «Назад»). */
const NAV_BEFORE_PREV = {
  3: { path: '/' },
  5: { path: '/environments' },
  9: { path: '/create' },
  10: { path: '/profile', hash: '#profile-teamcity' },
  11: { path: '/' },
}

/**
 * Поэкранное знакомство (driver.js). Только клиент.
 *
 * @param {import('vue-router').Router} router
 * @param {{
 *   onTourFinished?: () => void | Promise<void>
 * }} hooks — завершение тура с последнего шага («Готово»), не отмена крестиком.
 */
export function runOteOnboardingTour(router, hooks = {}) {
  let finishedWithTour = false

  const steps = /** @type {import('driver.js').DriveStep[]} */ ([
    {
      element: '[data-tour="tour-sidebar-nav"]',
      popover: {
        title: 'Разделы слева',
        description:
          'Основные экраны всегда под рукой. Часть подсказок на других страницах — переход выполнится после «Далее».',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="tour-sidebar-home"]',
      popover: {
        title: 'Главная',
        description: 'Сводка ваших окружений и быстрые переходы. Удобно вернуться сюда после операций.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="tour-sidebar-env"]',
      popover: {
        title: 'Окружения OTE',
        description: 'Откроется список стендов: таблица каталога и карточки с операциями над ВМ.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="tour-env-overview"]',
      popover: {
        title: 'Список окружений',
        description:
          'Здесь заголовок раздела и кнопка «Создать новую OTE». Ниже — фильтры и (для каталога YC) кнопка настройки колонок. Таблица появится после загрузки данных.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="tour-sidebar-create"]',
      popover: {
        title: 'Создать OTE',
        description:
          'Дальше перейдём в мастер: шаблон, параметры YAML, кнопка запуска сборки и блок статуса на той же странице.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="tour-create-template-block"]',
      popover: {
        title: 'Шаблон сборки',
        description:
          'Шаблон задаёт конфигурацию и предпросмотр YAML. Можно переключиться на плитки, отметить избранное или открыть конфиг TeamCity в новой вкладке.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="tour-create-params"]',
      popover: {
        title: 'Параметры и YAML',
        description:
          'Значения подставляются в шаблон. Ниже — предпросмотр YAML и ручное редактирование; синтаксис проверится на сервере перед отправкой в TeamCity.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="tour-create-actions"]',
      popover: {
        title: 'Запуск',
        description:
          '«Создать OTE» ставит задачу в очередь. После отправки появятся номер запроса и ссылки на лог сборки; статус также приходит в колокол уведомлений.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="tour-sidebar-templates"]',
      popover: {
        title: 'Шаблоны',
        description:
          'Единый каталог типовых конфигураций. Редактировать могут администраторы шаблонов и владельцы личных шаблонов — по правам вашей группы.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="tour-profile-teamcity"]',
      popover: {
        title: 'TeamCity и токен',
        description:
          'Обязательно сохраните токен доступа к TeamCity и URL вашего сервера — без них запуск сборки из OTE Manager невозможен. Если поля не заполнены, на странице создания будет предупреждение со ссылкой сюда.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="tour-topbar-notifications"]',
      popover: {
        title: 'Уведомления',
        description:
          'По колоколу видно результат долгих операций и ошибки TeamCity, со ссылками на нужные экраны — не нужно искать статус по разделам.',
        side: 'bottom',
      },
    },
    {
      popover: {
        title: 'Готово!',
        description:
          'Если появятся вопросы по вашей площадке, загляните в раздел «О проекте» или к администраторам организации.',
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

      const nav = NAV_BEFORE_NEXT[i]
      if (nav) {
        void settleRoute(router, nav.path, nav.hash).then(() => {
          d.moveNext()
          d.refresh()
        })
      } else {
        d.moveNext()
      }
    },
    onPrevClick() {
      const i = d.getActiveIndex()
      if (i === undefined || i <= 0) return

      const nav = NAV_BEFORE_PREV[i]
      if (nav) {
        void settleRoute(router, nav.path, nav.hash).then(() => {
          d.movePrevious()
          d.refresh()
        })
      } else {
        d.movePrevious()
      }
    },
    onDestroyed() {
      if (finishedWithTour) void hooks.onTourFinished?.()
      else postponeOnboardingOfferForSession()
    },
  })

  settleRoute(router, '/', '').then(() => {
    d.drive()
    d.refresh()
  })
}
