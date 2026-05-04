import { createError } from 'h3'
import { ROLE_CODES } from '@app-constants/rbac.js'
import { getDb } from '../db/client.js'
import { ensureOteUserRbacState, fetchRoleCodesForUserKey } from './rbac/bootstrap.js'
import { integrationUserKey } from './integrations/user-credentials.js'
import { requireOteUser } from './require-ote-auth.js'

/**
 * Авторизованный пользователь с ролью `admin` в БД.
 *
 * @param {import('h3').H3Event} event
 */
export async function requireOteAdmin(event) {
  const config = useRuntimeConfig(event)
  const user = requireOteUser(event)
  const db = getDb()
  await ensureOteUserRbacState(db, config, user)
  const userKey = integrationUserKey(user)
  const codes = await fetchRoleCodesForUserKey(db, userKey)
  if (!codes.includes(ROLE_CODES.ADMIN)) {
    throw createError({ statusCode: 403, message: 'Нужны права администратора' })
  }
  return { user, userKey, db, roleCodes: codes }
}
