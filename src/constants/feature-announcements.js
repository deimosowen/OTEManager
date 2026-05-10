/**
 * Анонсы новых возможностей (порядок в массиве = очередь показа).
 * id должен быть стабильным; после показа пользователю id попадает в `user_settings.feature_announcements_dismissed`.
 */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   intro: string,
 *   bullets?: string[],
 *   primaryLink?: { to: string, label: string },
 *   tour?: string,
 * }} FeatureAnnouncement
 */

/** @type {FeatureAnnouncement[]} */
export const FEATURE_ANNOUNCEMENTS = [
  {
    id: 'feat_automation_v1',
    title: 'Появились автоматизации',
    intro:
      'Короткая экскурсия по разделу и кнопкам на главной — как в знакомстве с приложением: шаги «Назад» и «Далее». Можно закрыть крестиком в любой момент.',
    tour: 'automation_v1',
  },
]

/**
 * @param {string} id
 * @returns {FeatureAnnouncement | null}
 */
export function getFeatureAnnouncementById(id) {
  const s = String(id || '').trim()
  if (!s) return null
  return FEATURE_ANNOUNCEMENTS.find((a) => a.id === s) ?? null
}

/**
 * @param {string} id
 */
export function isRegisteredFeatureAnnouncementId(id) {
  return Boolean(getFeatureAnnouncementById(id))
}

/**
 * Первый анонс из реестра, которого нет в списке закрытых.
 * @param {string[]} dismissedIds
 * @returns {FeatureAnnouncement | null}
 */
export function pickNextFeatureAnnouncement(dismissedIds) {
  const set = new Set((dismissedIds || []).map(String))
  for (const a of FEATURE_ANNOUNCEMENTS) {
    if (!set.has(a.id)) return a
  }
  return null
}

/**
 * Усечённая копия для ответа API / сессии (без лишних полей).
 * @param {FeatureAnnouncement | null | undefined} a
 */
export function announcementToPublicPayload(a) {
  if (!a) return null
  return {
    id: a.id,
    title: a.title,
    intro: a.intro,
    bullets: Array.isArray(a.bullets) ? [...a.bullets] : [],
    primaryLink: a.primaryLink ? { to: a.primaryLink.to, label: a.primaryLink.label } : undefined,
    tour: typeof a.tour === 'string' && a.tour.trim() ? a.tour.trim() : undefined,
  }
}
