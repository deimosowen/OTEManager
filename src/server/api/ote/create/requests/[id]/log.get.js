import { eq } from 'drizzle-orm'
import { getDb } from '../../../../../db/client.js'
import { oteTcCreations } from '../../../../../db/schema.js'
import { integrationUserKey } from '../../../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../../../utils/require-ote-auth.js'
import { fetchTeamCityBuildLogPlain } from '../../../../../utils/teamcity/build-log.js'
import { resolveTeamCityAuthorizationHeader } from '../../../../../utils/teamcity/resolve-auth.js'

function parseId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

function canAccessCreationRow(user, row) {
  const key = integrationUserKey(user)
  if (row.actorLogin === key) return true
  const em = String(user?.email || '').trim()
  return Boolean(em && row.actorEmail === em)
}

/**
 * Текст лога сборки TeamCity для запроса создания OTE (обновляется на стороне TC).
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
  setResponseHeader(event, 'Pragma', 'no-cache')

  const user = requireOteUser(event)
  const id = parseId(event.context.params?.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Некорректный id' })
  }

  const db = getDb()
  const rows = await db.select().from(oteTcCreations).where(eq(oteTcCreations.id, id)).limit(1)
  const row = rows[0]
  if (!row) {
    throw createError({ statusCode: 404, message: 'Запись не найдена' })
  }
  if (!canAccessCreationRow(user, row)) {
    throw createError({ statusCode: 403, message: 'Нет доступа к этой записи' })
  }

  const buildId = row.teamcityBuildId ? String(row.teamcityBuildId).trim() : ''
  if (!buildId) {
    return {
      log: '',
      truncated: false,
      message: 'Идентификатор сборки TeamCity ещё не назначен — лог появится после постановки в очередь.',
      httpStatus: 0,
    }
  }

  const config = useRuntimeConfig(event)
  const authorization = await resolveTeamCityAuthorizationHeader(config, { user })
  if (!authorization) {
    throw createError({
      statusCode: 503,
      message: 'Нет доступа к TeamCity: добавьте токен в профиле или настройте серверные учётные данные.',
    })
  }

  const result = await fetchTeamCityBuildLogPlain({ config, buildId, authorization })

  if (result.error === 'log_not_ready' || result.httpStatus === 404) {
    return {
      log: '',
      truncated: false,
      message:
        'Лог пока недоступен (сборка в очереди или ещё не стартовала на агенте). Обновите через несколько секунд.',
      httpStatus: result.httpStatus,
    }
  }

  if (result.error && result.error !== null) {
    return {
      log: '',
      truncated: false,
      message:
        result.error === 'no_auth'
          ? 'Не удалось авторизоваться в TeamCity.'
          : `Не удалось загрузить лог (код ${result.httpStatus || '—'}).`,
      httpStatus: result.httpStatus,
    }
  }

  return {
    log: result.text,
    truncated: result.truncated,
    message: result.truncated
      ? `Показан конец лога (последние ${String(result.text.length)} символов из большего файла).`
      : null,
    httpStatus: result.httpStatus,
  }
})
