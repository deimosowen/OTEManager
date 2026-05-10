import { AUDIT_ACTION } from '@app-constants/audit.js'
import { createError } from 'h3'
import { assertMetadataTagNotBlockedByOteCreation } from './ote-tc-creation-guard.js'
import {
  clearTcPending,
  peekTcPending,
  reserveTcPendingSlot,
  updateTcPendingBuildId,
} from './ote-tc-pending.js'
import { auditPayloadFromUser, recordAuditEvent } from './audit-log.js'
import { integrationUserKey } from './integrations/user-credentials.js'
import { queueTeamCityBuild } from './teamcity/client.js'
import { pickMetadataTagFromMembers } from './teamcity/metadata-tag.js'
import { runtimeConfigString } from './yc/config-helpers.js'
import { listMemberInstancesForOteId } from './yc/ote-members.js'

/**
 * Поставить в TeamCity сборку старта или остановки OTE (как POST .../instances/:id/teamcity).
 *
 * @param {{
 *   db: import('drizzle-orm').LibSQLDatabase,
 *   config: import('@nuxt/schema').NitroRuntimeConfig,
 *   user: { login?: string, email?: string, id?: string },
 *   folderId: string,
 *   session: import('@yandex-cloud/nodejs-sdk').Session,
 *   oteResourceId: string,
 *   action: 'start' | 'stop',
 *   tcRestBaseUrl: string,
 *   buildTypeId: string,
 *   authorization: string,
 *   preloadedInstances?: import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[],
 * }} opts
 * @returns {Promise<{ metadataTag: string, buildTypeId: string, teamCity: Record<string, unknown> }>}
 */
export async function queueOteTeamCityStartStopBuild(opts) {
  const {
    db,
    config,
    user,
    folderId,
    session,
    oteResourceId,
    action,
    tcRestBaseUrl,
    buildTypeId,
    authorization,
    preloadedInstances,
  } = opts

  if (action !== 'start' && action !== 'stop') {
    throw createError({ statusCode: 400, message: 'Ожидается action: start или stop' })
  }

  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'

  const members = await listMemberInstancesForOteId(session, folderId, oteResourceId, config, preloadedInstances)
  if (!members.length) {
    throw createError({ statusCode: 404, message: 'ВМ не найдены' })
  }

  const existing = await peekTcPending(oteResourceId)
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

  if (!buildTypeId) {
    throw createError({
      statusCode: 503,
      message: 'Для вашей группы не задан buildTypeId для этой операции в настройках.',
    })
  }

  try {
    const properties = { 'metadata.tag': metadataTag }
    const tcAuthUserKey = integrationUserKey(user)
    const reserved = await reserveTcPendingSlot(oteResourceId, {
      action,
      tcAuthUserKey,
      tcRestBaseUrl,
    })
    if (!reserved) {
      const cur = await peekTcPending(oteResourceId)
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
        baseUrl: tcRestBaseUrl,
        buildTypeId,
        properties,
        authorization,
      })
    } catch (queueErr) {
      await clearTcPending(oteResourceId)
      throw queueErr
    }
    await updateTcPendingBuildId(oteResourceId, { buildId: tc.buildId })
    const auditAction = action === 'start' ? AUDIT_ACTION.OTE_TC_START : AUDIT_ACTION.OTE_TC_STOP
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: auditAction,
        oteResourceId,
        oteTag: metadataTag,
        details: {
          teamCityBuildId: tc.buildId || null,
          buildTypeId,
        },
      }),
    )
    return {
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
}
