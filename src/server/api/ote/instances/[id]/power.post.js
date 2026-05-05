import { AUDIT_ACTION } from '@app-constants/audit.js'
import { getDb } from '../../../../db/client.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../../utils/audit-log.js'
import { assertMetadataTagNotBlockedByOteCreation } from '../../../../utils/ote-tc-creation-guard.js'
import { peekTcPending } from '../../../../utils/ote-tc-pending.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'
import { requireYcFolderIdForUser } from '../../../../utils/yc/group-settings.js'
import { COMMAND_TYPES } from '../../../../utils/command-queue/command-types.js'
import { getCommandQueue } from '../../../../utils/command-queue/queue.js'
import { runtimeConfigString } from '../../../../utils/yc/config-helpers.js'
import { createYandexCloudSession } from '../../../../utils/yc/session.js'
import { pickMetadataTagFromMembers } from '../../../../utils/teamcity/metadata-tag.js'
import { listMemberInstancesForOteId } from '../../../../utils/yc/ote-members.js'

/**
 * Запуск / остановка всех ВМ OTE: `{ "action": "start" | "stop" }`.
 * Выполнение ставится во внутреннюю очередь; обработчик пока — заглушка (без YC).
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Не указан id' })
  }
  const body = await readBody(event)
  const action = body && typeof body.action === 'string' ? body.action.toLowerCase() : ''
  if (action !== 'start' && action !== 'stop') {
    throw createError({ statusCode: 400, message: 'Ожидается action: start или stop' })
  }
  const config = useRuntimeConfig(event)
  const db = getDb()
  const folderId = await requireYcFolderIdForUser(db, user)
  const session = createYandexCloudSession(config)
  if (!session) {
    throw createError({ statusCode: 503, message: 'Не настроен ключ сервисного аккаунта YC' })
  }
  const members = await listMemberInstancesForOteId(session, folderId, id, config)
  if (!members.length) {
    throw createError({ statusCode: 404, message: 'ВМ не найдены' })
  }

  const tcWait = await peekTcPending(id)
  if (tcWait) {
    throw createError({
      statusCode: 409,
      message:
        'Нельзя запускать/останавливать ВМ через API, пока не завершена операция TeamCity (запуск или остановка по тегу).',
      data: { current: tcWait },
    })
  }

  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'
  const metadataTag = pickMetadataTagFromMembers(members, labelKey)
  await assertMetadataTagNotBlockedByOteCreation(db, metadataTag)

  const jobResult = await getCommandQueue().dispatch(
    COMMAND_TYPES.OTE_INSTANCE_POWER,
    {
      oteId: id,
      action,
      memberIds: members.map((m) => m.id).filter(Boolean),
    },
    { path: event.path },
  )

  const oteTag = metadataTag || null
  const auditAction = action === 'start' ? AUDIT_ACTION.OTE_POWER_START : AUDIT_ACTION.OTE_POWER_STOP
  await recordAuditEvent(
    auditPayloadFromUser(user, {
      actionCode: auditAction,
      oteResourceId: id,
      oteTag,
      details: { powerAction: action, affected: members.length, queueResult: jobResult != null },
    }),
  )

  return {
    action,
    affected: members.length,
    stub: true,
    job: jobResult,
  }
})
