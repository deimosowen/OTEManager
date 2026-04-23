/**
 * Запрос к своему Nitro API с абсолютным URL (иначе Vue Router может пытаться разрешить `/api/...` как страницу).
 * @param {string} path путь с ведущим слэшем, например `/api/auth/session`
 * @param {RequestInit} [init]
 */
export async function fetchInternalApi(path, init = {}) {
  const origin = import.meta.server ? useRequestURL().origin : window.location.origin
  const p = path.startsWith('/') ? path : `/${path}`
  /** `new URL` гарантирует корректный абсолютный URL (Vue Router не трогает такие запросы). */
  const url = new URL(p, `${origin.replace(/\/+$/, '')}/`).href

  const merged = {
    credentials: 'include',
    ...init,
    headers: { ...(init.headers || {}) },
  }

  if (import.meta.server) {
    const cookie = useRequestHeaders(['cookie']).cookie
    if (cookie) merged.headers.cookie = cookie
  }

  return fetch(url, merged)
}
