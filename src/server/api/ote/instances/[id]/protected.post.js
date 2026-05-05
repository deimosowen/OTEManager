import { AUDIT_ACTION } from '@app-constants/audit.js'
import {
  OTE_PROTECT_DELETE_DATE_YMD,
  OTE_UNPROTECT_DEFAULT_DELETE_DAYS,
} from '@app-constants/ote-protected.js'
import { utcCalendarDatePlusDaysFromToday } from '../../../../utils/teamcity/delete-date-days.js'
import { runTeamCityModifyDeleteDateBuild } from '../../../../utils/teamcity/modify-delete-date-build.js'
import { getDb } from '../../../../db/client.js'
import {
  deleteOteProtectedRow,
  insertOteProtectedRow,
  isOteResourceProtected,
} from '../../../../utils/ote-protected.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'
import { integrationUserKey } from '../../../../utils/integrations/user-credentials.js'
import { requireYcFolderIdForUser } from '../../../../utils/yc/group-settings.js'
import { runtimeConfigString } from '../../../../utils/yc/config-helpers.js'
import { createYandexCloudSession } from '../../../../utils/yc/session.js'

/**
 * Защита OTE или снятие защиты (после подтверждения во фронте).
 * Тело: `{ "confirm": true, "protected": true | false }`.
 * При включении: запись в БД после успешной постановки в TC даты удаления `{OTE_PROTECT_DELETE_DATE_YMD}`.
 * При выключении: после успеха TC — удаление строки из БД; в TC — дефолтная дата `+OTE_UNPROTECT_DEFAULT_DELETE_DAYS` с UTC-сегодня.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Не указан id' })
  }
  const body = await readBody(event)
  if (!body || body.confirm !== true) {
    throw createError({ statusCode: 400, message: 'Требуется confirm: true' })
  }
  if (typeof body.protected !== 'boolean') {
    throw createError({ statusCode: 400, message: 'Укажите protected: true или false' })
  }
  const wantProtect = body.protected

  const db = getDb()
  const config = useRuntimeConfig(event)
  const folderId = await requireYcFolderIdForUser(db, user)
  const session = createYandexCloudSession(config)
  if (!session) {
    throw createError({ statusCode: 503, message: 'Не настроен ключ сервисного аккаунта YC' })
  }
  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'

  const userKeyMark = integrationUserKey(user)

  if (wantProtect) {
    if (await isOteResourceProtected(db, id)) {
      throw createError({ statusCode: 409, message: 'Эта OTE уже отмечена как защищённая.' })
    }
    const rc = await runTeamCityModifyDeleteDateBuild({
      db,
      config,
      user,
      folderId,
      session,
      labelKey,
      oteResourceId: id,
      deleteDateYmd: OTE_PROTECT_DELETE_DATE_YMD,
      auditActionCode: AUDIT_ACTION.OTE_PROTECT,
      auditExtraDetails: { via: 'protected_toggle', targetDate: OTE_PROTECT_DELETE_DATE_YMD },
    })
    await insertOteProtectedRow(db, { oteResourceId: id, markedByUserKey: userKeyMark })
    return {
      ok: true,
      protected: true,
      deleteDateYmd: OTE_PROTECT_DELETE_DATE_YMD,
      teamCity: rc.teamCity,
    }
  }

  if (!(await isOteResourceProtected(db, id))) {
    throw createError({ statusCode: 409, message: 'Эта OTE не помечена как защищённая.' })
  }
  const restoreYmd = utcCalendarDatePlusDaysFromToday(OTE_UNPROTECT_DEFAULT_DELETE_DAYS)
  if (!restoreYmd) {
    throw createError({ statusCode: 500, message: 'Не удалось вычислить дату восстановления автоудаления' })
  }
  const rc = await runTeamCityModifyDeleteDateBuild({
    db,
    config,
    user,
    folderId,
    session,
    labelKey,
    oteResourceId: id,
    deleteDateYmd: restoreYmd,
    auditActionCode: AUDIT_ACTION.OTE_UNPROTECT,
    auditExtraDetails: { via: 'protected_toggle', restoreDeleteDate: restoreYmd, daysFromToday: OTE_UNPROTECT_DEFAULT_DELETE_DAYS },
  })
  await deleteOteProtectedRow(db, id)
  return {
    ok: true,
    protected: false,
    deleteDateYmd: restoreYmd,
    teamCity: rc.teamCity,
  }
})
