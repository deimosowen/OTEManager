/**
 * Путь после логина: только страницы приложения, не `/api/*`.
 * @param {unknown} raw
 * @returns {string}
 */
export function safeReturnPath(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/'
  if (raw.startsWith('/api')) return '/'
  return raw
}
