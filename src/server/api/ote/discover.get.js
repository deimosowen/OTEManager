import { getDb } from '../../db/client.js'
import { requireOteUser } from '../../utils/require-ote-auth.js'
import { requireYcFolderIdForUser } from '../../utils/yc/group-settings.js'
import { runtimeConfigString } from '../../utils/yc/config-helpers.js'
import { createYandexCloudSession } from '../../utils/yc/session.js'
import { aggregateDiscoveryFromInstances, listAllInstancesInFolder } from '../../utils/yc/compute.js'

/**
 * Какие ключи **меток** и **user metadata** реально есть у ВМ в каталоге — чтобы настроить MVP и TeamCity.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const config = useRuntimeConfig(event)
  const db = getDb()
  const folderId = await requireYcFolderIdForUser(db, user)
  const session = createYandexCloudSession(config)
  if (!session) {
    throw createError({ statusCode: 503, message: 'Не настроен ключ сервисного аккаунта YC' })
  }
  const all = await listAllInstancesInFolder(session, folderId)
  const agg = aggregateDiscoveryFromInstances(all, 5)
  return {
    instanceCount: all.length,
    ...agg,
    hint:
      'Метки задаются при создании ВМ (Terraform / CLI). Metadata — пары ключ–значение в консоли YC у инстанса. Список полей Compute API: https://cloud.yandex.ru/docs/compute/concepts/vm-metadata',
  }
})
