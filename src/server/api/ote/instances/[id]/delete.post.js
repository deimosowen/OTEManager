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
 * Удаление всех ВМ OTE. Тело: `{ "confirm": true }`.
 * Выполнение ставится во внутреннюю очередь; обработчик пока — заглушка (без YC).
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
        'Нельзя удалить OTE, пока не завершена операция TeamCity (запуск, остановка, удаление или изменение даты удаления по тегу). Дождитесь окончания или истечения ожидания.',
      data: { current: tcWait },
    })
  }

  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'
  const metadataTag = pickMetadataTagFromMembers(members, labelKey)
  await assertMetadataTagNotBlockedByOteCreation(db, metadataTag)

  const jobResult = await getCommandQueue().dispatch(
    COMMAND_TYPES.OTE_INSTANCE_DELETE,
    {
      oteId: id,
      confirm: true,
      memberIds: members.map((m) => m.id).filter(Boolean),
    },
    { path: event.path },
  )

  const oteTag = metadataTag || null
  await recordAuditEvent(
    auditPayloadFromUser(user, {
      actionCode: AUDIT_ACTION.OTE_QUEUE_DELETE,
      oteResourceId: id,
      oteTag,
      details: { affected: members.length, queueResult: jobResult != null },
    }),
  )

  return {
    affected: members.length,
    stub: true,
    job: jobResult,
  }
})
