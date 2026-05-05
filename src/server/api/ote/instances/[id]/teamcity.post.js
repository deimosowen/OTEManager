import { AUDIT_ACTION } from '@app-constants/audit.js'
import { runTeamCityModifyDeleteDateBuild } from '../../../../utils/teamcity/modify-delete-date-build.js'
import { getDb } from '../../../../db/client.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../../utils/audit-log.js'
import { assertMetadataTagNotBlockedByOteCreation } from '../../../../utils/ote-tc-creation-guard.js'
import {
  clearTcPending,
  peekTcPending,
  reserveTcPendingSlot,
  updateTcPendingBuildId,
} from '../../../../utils/ote-tc-pending.js'
import { isOteResourceProtected } from '../../../../utils/ote-protected.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'
import { integrationUserKey } from '../../../../utils/integrations/user-credentials.js'
import { queueTeamCityBuild } from '../../../../utils/teamcity/client.js'
import { fetchTeamCityGroupSettingsByUserKey } from '../../../../utils/teamcity/group-settings.js'
import { isTeamCityAuthAvailable, resolveTeamCityAuthorizationHeader } from '../../../../utils/teamcity/resolve-auth.js'
import { pickMetadataTagFromMembers } from '../../../../utils/teamcity/metadata-tag.js'
import { requireYcFolderIdForUser } from '../../../../utils/yc/group-settings.js'
import { runtimeConfigString } from '../../../../utils/yc/config-helpers.js'
import { createYandexCloudSession } from '../../../../utils/yc/session.js'
import { listMemberInstancesForOteId } from '../../../../utils/yc/ote-members.js'

/**
 * Поставить в TeamCity сборку по тегу OTE: старт, стоп, удаление или смена даты автоудаления.
 * Тело: `{ "action": "start" | "stop" | "delete" | "modify_delete_date", "deleteDate"?: "YYYY-MM-DD" }`.
 * Для `modify_delete_date`: `deleteDate` строго после сегодня (UTC); в TC передаются `metadata.tag` и `days_life`.
 *
 * Защищённую OTE нельзя удалить через это API и нельзя вручную менять дату удаления (`protected.post`).
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Не указан id' })
  }
  const body = await readBody(event)
  const action = body && typeof body.action === 'string' ? body.action.toLowerCase() : ''
  const deleteDateYmd =
    action === 'modify_delete_date' && body && typeof body.deleteDate === 'string' ? body.deleteDate.trim() : ''
  if (action !== 'start' && action !== 'stop' && action !== 'delete' && action !== 'modify_delete_date') {
    throw createError({ statusCode: 400, message: 'Ожидается action: start, stop, delete или modify_delete_date' })
  }
  if (action === 'modify_delete_date' && !deleteDateYmd) {
    throw createError({ statusCode: 400, message: 'Укажите deleteDate в формате YYYY-MM-DD' })
  }

  const config = useRuntimeConfig(event)

  const db = getDb()

  const folderId = await requireYcFolderIdForUser(db, user)
  const session = createYandexCloudSession(config)
  if (!session) {
    throw createError({ statusCode: 503, message: 'Не настроен ключ сервисного аккаунта YC' })
  }

  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'

  if (action === 'modify_delete_date') {
    if (await isOteResourceProtected(db, id)) {
      throw createError({
        statusCode: 403,
        message:
          'Для защищённой OTE нельзя менять дату автоудаления вручную. Снимите флаг «Защищённая» на странице окружения.',
      })
    }
    const rc = await runTeamCityModifyDeleteDateBuild({
      db,
      config,
      user,
      folderId,
      session,
      labelKey,
      oteResourceId: id,
      deleteDateYmd,
      auditActionCode: AUDIT_ACTION.OTE_TC_MODIFY_DELETE_DATE,
    })
    return {
      ok: true,
      action,
      metadataTag: rc.metadataTag,
      buildTypeId: rc.buildTypeId,
      teamCity: rc.teamCity,
    }
  }

  if (!(await isTeamCityAuthAvailable(config, { user }))) {
    throw createError({
      statusCode: 503,
      message: 'TeamCity недоступен: добавьте персональный токен в профиле (раздел «Интеграции»).',
    })
  }

  const userKey = integrationUserKey(user)
  const g = await fetchTeamCityGroupSettingsByUserKey(db, userKey)
  if (!g?.tcRestBaseUrl) {
    throw createError({
      statusCode: 503,
      message: 'Для вашей группы не задан URL REST TeamCity. Администратор может настроить это в разделе «Система».',
    })
  }
  const tcBase = g.tcRestBaseUrl

  const members = await listMemberInstancesForOteId(session, folderId, id, config)
  if (!members.length) {
    throw createError({ statusCode: 404, message: 'ВМ не найдены' })
  }

  if (action === 'delete' && (await isOteResourceProtected(db, id))) {
    throw createError({
      statusCode: 403,
      message:
        'Защищённую OTE нельзя удалить через TeamCity. Снимите флаг «Защищённая» на странице окружения — после этого удаление станет доступно.',
    })
  }

  const existing = await peekTcPending(id)
  if (existing) {
    throw createError({
      statusCode: 409,
      message:
        'Для этой OTE уже запущена операция TeamCity (запуск, остановка, удаление или изменение даты удаления). Дождитесь завершения сборки или истечёт время ожидания.',
      data: { current: existing },
    })
  }

  const metadataTag = pickMetadataTagFromMembers(members, labelKey)
  if (!metadataTag) {
    throw createError({
      statusCode: 400,
      message: `Не удалось определить metadata.tag (метка «${labelKey}» на ВМ)`,
    })
  }

  await assertMetadataTagNotBlockedByOteCreation(db, metadataTag)

  const buildTypeId =
    action === 'start' ? g.startBuildTypeId : action === 'stop' ? g.stopBuildTypeId : g.deleteBuildTypeId
  if (!buildTypeId) {
    throw createError({ statusCode: 503, message: 'Для вашей группы не задан buildTypeId для этой операции в настройках.' })
  }

  try {
    const authorization = await resolveTeamCityAuthorizationHeader(config, { user })
    const properties = { 'metadata.tag': metadataTag }
    if (action === 'delete') {
      properties['delete.exact_match'] = 'true'
    }

    const pendingAction = action
    const tcAuthUserKey = integrationUserKey(user)
    const reserved = await reserveTcPendingSlot(id, {
      action: pendingAction,
      tcAuthUserKey,
      tcRestBaseUrl: tcBase,
    })
    if (!reserved) {
      const cur = await peekTcPending(id)
      throw createError({
        statusCode: 409,
        message:
          'Для этой OTE уже запущена операция TeamCity (запуск, остановка, удаление или изменение даты удаления). Дождитесь завершения сборки или истечёт время ожидания.',
        data: { current: cur },
      })
    }
    let tc
    try {
      tc = await queueTeamCityBuild({
        config,
        baseUrl: tcBase,
        buildTypeId,
        properties,
        authorization,
      })
    } catch (queueErr) {
      await clearTcPending(id)
      throw queueErr
    }
    await updateTcPendingBuildId(id, { buildId: tc.buildId })
    const auditAction =
      action === 'start'
        ? AUDIT_ACTION.OTE_TC_START
        : action === 'stop'
          ? AUDIT_ACTION.OTE_TC_STOP
          : AUDIT_ACTION.OTE_TC_DELETE
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: auditAction,
        oteResourceId: id,
        oteTag: metadataTag,
        details: {
          teamCityBuildId: tc.buildId || null,
          buildTypeId,
        },
      }),
    )
    return {
      ok: true,
      action,
      metadataTag,
      buildTypeId,
      teamCity: tc,
    }
  } catch (err) {
    const code = typeof err?.statusCode === 'number' ? err.statusCode : undefined
    if (code === 409) throw err
    const msg = err?.message || String(err)
    throw createError({ statusCode: 502, message: msg })
  }
})
