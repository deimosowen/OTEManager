/**
 * In-memory доставка событий уведомлений по SSE-подключениям пользователя (один процесс Node).
 * При нескольких репликах без общего канала второй процесс не увидит событие — нужен общий broker.
 */

/** @type {Map<string, Set<(jsonLine: string) => void>>} */
const byUserKey = new Map()

/**
 * @param {string} userKey
 * @param {(jsonLine: string) => void} push — передать уже сериализованное тело сообщения SSE `data:` (одна строка JSON)
 * @returns {() => void} отписка
 */
export function subscribeUserNotificationSse(userKey, push) {
  if (!userKey) return () => {}
  let set = byUserKey.get(userKey)
  if (!set) {
    set = new Set()
    byUserKey.set(userKey, set)
  }
  set.add(push)
  return () => {
    set.delete(push)
    if (set.size === 0) byUserKey.delete(userKey)
  }
}

/**
 * @param {string} userKey
 * @param {unknown} obj — объект, будет отправлен как data: JSON (без второго кодирования)
 */
export function publishUserNotificationJson(userKey, obj) {
  const set = userKey ? byUserKey.get(userKey) : null
  if (!set || !set.size) return
  const jsonLine = JSON.stringify(obj)
  for (const push of [...set]) {
    try {
      push(jsonLine)
    } catch {
      set.delete(push)
    }
  }
}
