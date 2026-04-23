import { AUDIT_ACTION } from '@app-constants/audit.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../../utils/audit-log.js'
import { peekTcPending } from '../../../../utils/ote-tc-pending.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'
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
  const folderId = runtimeConfigString(config.ycFolderId, 'NUXT_YC_FOLDER_ID')
  if (!folderId) {
    throw createError({ statusCode: 503, message: 'Не задан NUXT_YC_FOLDER_ID' })
  }
  const session = createYandexCloudSession(config)
  if (!session) {
    throw createError({ statusCode: 503, message: 'Не настроен ключ сервисного аккаунта YC' })
  }
  const members = await listMemberInstancesForOteId(session, folderId, id, config)
  if (!members.length) {
    throw createError({ statusCode: 404, message: 'ВМ не найдены' })
  }

  const tcWait = peekTcPending(id)
  if (tcWait) {
    throw createError({
      statusCode: 409,
      message:
        'Нельзя удалить OTE, пока не завершена операция TeamCity (запуск, остановка или удаление по тегу). Дождитесь окончания или истечения ожидания.',
      data: { current: tcWait },
    })
  }

  const jobResult = await getCommandQueue().dispatch(
    COMMAND_TYPES.OTE_INSTANCE_DELETE,
    {
      oteId: id,
      confirm: true,
      memberIds: members.map((m) => m.id).filter(Boolean),
    },
    { path: event.path },
  )

  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'
  const oteTag = pickMetadataTagFromMembers(members, labelKey) || null
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
