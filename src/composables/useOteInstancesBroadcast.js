const CHANNEL_NAME = 'ote-manager-instances-v1'

/** @type {BroadcastChannel | null} */
let channel = null

function getChannel() {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

/**
 * Сообщить другим вкладкам того же origin: список OTE нужно перезагрузить с сервера
 * (например, после постановки сборки TeamCity).
 */
export function notifyOteInstancesRefresh() {
  try {
    getChannel()?.postMessage({ type: 'refresh', ts: Date.now() })
  } catch {
    /* игнорируем */
  }
}

/**
 * Подписка на запрос обновления списка из других вкладок.
 * @param {() => void} handler
 * @returns {() => void} отписка
 */
export function subscribeOteInstancesRefresh(handler) {
  const ch = getChannel()
  if (!ch) return () => {}
  const fn = (ev) => {
    if (ev?.data?.type === 'refresh') handler()
  }
  ch.addEventListener('message', fn)
  return () => {
    ch.removeEventListener('message', fn)
  }
}
