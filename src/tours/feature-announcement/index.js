import { runAutomationOverviewTour } from '~/tours/feature-announcement/automation-overview-tour.js'

export { runAutomationOverviewTour }

/**
 * Запуск тура анонса фичи по строковому ключу (например `automation_v1`).
 *
 * @param {import('vue-router').Router} router
 * @param {string} tourKind
 * @param {{ onTourEnded?: (p: { finished: boolean }) => void | Promise<void> }} [hooks]
 */
export function runFeatureAnnouncementTour(router, tourKind, hooks = {}) {
  const k = String(tourKind || '').trim()
  if (k === 'automation_v1') {
    runAutomationOverviewTour(router, hooks)
    return
  }
}
