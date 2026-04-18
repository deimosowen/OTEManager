/**
 * Разрешённые пути после OAuth: только внутренние страницы, не /api (иначе SPA откроется на API и Router ругается).
 * @param {unknown} raw
 * @returns {string}
 */
export function safeReturnPath(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/'
  if (raw.startsWith('/api')) return '/'
  return raw
}
