/** Стабильные коды ролей (совпадают с `app_roles.code` в БД). */
export const ROLE_CODES = /** @type {const} */ ({
  USER: 'user',
  ADMIN: 'admin',
})

/** @param {unknown} roles */
export function userHasAdminRole(roles) {
  if (!Array.isArray(roles)) return false
  return roles.some((r) => String(r || '').trim() === ROLE_CODES.ADMIN)
}
