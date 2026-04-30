import { AUDIT_ACTION } from '@app-constants/audit.js'
import { getDb } from '../../../../db/client.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../../utils/audit-log.js'
import { assertMetadataTagNotBlockedByOteCreation } from '../../../../utils/ote-tc-creation-guard.js'
import { markTcPending, peekTcPending } from '../../../../utils/ote-tc-pending.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'
import { integrationUserKey } from '../../../../utils/integrations/user-credentials.js'
import { queueTeamCityBuild } from '../../../../utils/teamcity/client.js'
import { isTeamCityAuthAvailable, resolveTeamCityAuthorizationHeader } from '../../../../utils/teamcity/resolve-auth.js'
import { pickMetadataTagFromMembers } from '../../../../utils/teamcity/metadata-tag.js'
import { runtimeConfigString } from '../../../../utils/yc/config-helpers.js'
import { createYandexCloudSession } from '../../../../utils/yc/session.js'
import { listMemberInstancesForOteId } from '../../../../utils/yc/ote-members.js'

/**
 * Поставить в TeamCity сборку Start/Stop/Delete по тегу OTE.
 * Тело: `{ "action": "start" | "stop" | "delete" }` — параметр сборки `metadata.tag` берётся из меток ВМ.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Не указан id' })
  }
  const body = await readBody(event)
  const action = body && typeof body.action === 'string' ? body.action.toLowerCase() : ''
  if (action !== 'start' && action !== 'stop' && action !== 'delete') {
    throw createError({ statusCode: 400, message: 'Ожидается action: start, stop или delete' })
  }

  const config = useRuntimeConfig(event)
  if (!(await isTeamCityAuthAvailable(config, { user }))) {
    throw createError({
      statusCode: 503,
      message:
        'TeamCity недоступен: добавьте персональный токен в профиле (раздел «Интеграции») или настройте серверные переменные NUXT_TC_ACCESS_TOKEN (либо NUXT_TC_USERNAME и NUXT_TC_PASSWORD).',
    })
  }

  const folderId = runtimeConfigString(config.ycFolderId, 'NUXT_YC_FOLDER_ID')
  if (!folderId) {
    throw createError({ statusCode: 503, message: 'Не задан NUXT_YC_FOLDER_ID' })
  }
  const session = createYandexCloudSession(config)
  if (!session) {
    throw createError({ statusCode: 503, message: 'Не настроен ключ сервисного аккаунта YC' })
  }

  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'
  const members = await listMemberInstancesForOteId(session, folderId, id, config)
  if (!members.length) {
    throw createError({ statusCode: 404, message: 'ВМ не найдены' })
  }

  const existing = peekTcPending(id)
  if (existing) {
    throw createError({
      statusCode: 409,
      message:
        'Для этой OTE уже запущена операция TeamCity (запуск, остановка или удаление). Дождитесь завершения сборки или истечёт время ожидания.',
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

  await assertMetadataTagNotBlockedByOteCreation(getDb(), metadataTag)

  const buildTypeId =
    action === 'start'
      ? runtimeConfigString(config.tcStartBuildTypeId, 'NUXT_TC_START_BUILD_TYPE_ID') ||
        'CasePro_UniversalDeploy_StartByTag'
      : action === 'stop'
        ? runtimeConfigString(config.tcStopBuildTypeId, 'NUXT_TC_STOP_BUILD_TYPE_ID') ||
          'CasePro_UniversalDeploy_StopByTag'
        : runtimeConfigString(config.tcDeleteBuildTypeId, 'NUXT_TC_DELETE_BUILD_TYPE_ID') ||
          'CasePro_UniversalDeploy_Delete'

  try {
    const authorization = await resolveTeamCityAuthorizationHeader(config, { user })
    const properties = { 'metadata.tag': metadataTag }
    if (action === 'delete') {
      properties['delete.exact_match'] = 'true'
    }
    const tc = await queueTeamCityBuild({
      config,
      buildTypeId,
      properties,
      authorization,
    })
    const tcAuthUserKey = integrationUserKey(user)
    markTcPending(id, { action, buildId: tc.buildId, tcAuthUserKey })
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
        details: { teamCityBuildId: tc.buildId || null, buildTypeId },
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
    const msg = err?.message || String(err)
    throw createError({ statusCode: 502, message: msg })
  }
})
