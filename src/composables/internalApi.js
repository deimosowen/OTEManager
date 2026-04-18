/**
 * Запрос к своему Nitro API с абсолютным URL (иначе Vue Router может пытаться разрешить `/api/...` как страницу).
 * @param {string} path путь с ведущим слэшем, например `/api/auth/session`
 * @param {RequestInit} [init]
 */
export async function fetchInternalApi(path, init = {}) {
  const origin = import.meta.server ? useRequestURL().origin : window.location.origin
  const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`

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
