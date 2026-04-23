import { requireOteUser } from '../../utils/require-ote-auth.js'
import { runtimeConfigString } from '../../utils/yc/config-helpers.js'
import { createYandexCloudSession } from '../../utils/yc/session.js'
import {
  buildTeamCityTable,
  filterAndBuildListRows,
  instanceMatchesLabelFilter,
  listAllInstancesInFolder,
} from '../../utils/yc/compute.js'
import { resolveTcPendingState } from '../../utils/ote-tc-pending.js'
import { buildMvpOptsFromRuntimeConfig } from '../../utils/yc/mvp-from-config.js'
import { listMemberInstancesForOteId } from '../../utils/yc/ote-members.js'

/**
 * Список OTE из Yandex Compute: ВМ в каталоге с меткой (по умолчанию `metadata-tag`).
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const config = useRuntimeConfig(event)
  const folderId = runtimeConfigString(config.ycFolderId, 'NUXT_YC_FOLDER_ID')
  if (!folderId) {
    throw createError({
      statusCode: 503,
      message: 'Не задан каталог Yandex Cloud (NUXT_YC_FOLDER_ID)',
    })
  }
  const session = createYandexCloudSession(config)
  if (!session) {
    throw createError({
      statusCode: 503,
      message:
        'Не настроен ключ сервисного аккаунта YC: задайте NUXT_YC_SA_KEY_PATH (файл JSON) или NUXT_YC_SERVICE_ACCOUNT_JSON',
    })
  }
  const all = await listAllInstancesInFolder(session, folderId)
  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'
  const labelValue = runtimeConfigString(config.ycInstanceLabelValue, 'NUXT_YC_INSTANCE_LABEL_VALUE')
  const groupBy = runtimeConfigString(config.ycGroupByLabelKey, 'NUXT_YC_GROUP_BY_LABEL_KEY') || 'metadata-tag'
  const mvp = buildMvpOptsFromRuntimeConfig(config)
  const items = filterAndBuildListRows(all, {
    labelKey,
    labelValue,
    groupByLabelKey: groupBy || null,
    mvp,
    actor: { login: user.login || '', email: user.email || '' },
  })
  for (const item of items) {
    const members = await listMemberInstancesForOteId(session, folderId, item.id, config)
    const pend = await resolveTcPendingState(item.id, members, config)
    item.tcOperationPending = pend || null
  }
  const filtered = all.filter((i) => instanceMatchesLabelFilter(i, labelKey, labelValue))
  const quotaCpu = Number(runtimeConfigString(config.ycQuotaMaxCpu, 'NUXT_YC_QUOTA_MAX_CPU'))
  const quotaMem = Number(runtimeConfigString(config.ycQuotaMaxMemoryGb, 'NUXT_YC_QUOTA_MAX_MEMORY_GB'))
  const tcTable = buildTeamCityTable(filtered, {
    labelKey,
    usernameLabelKeys: mvp.usernameLabelKeysForTc,
    deleteLabelKeys: mvp.deleteLabelKeys,
    deleteMetaKeys: mvp.deleteMetaKeys,
    quotaMaxCpu: quotaCpu,
    quotaMaxMemoryGb: quotaMem,
  })
  return {
    items,
    tcTable,
    syncedAt: new Date().toISOString(),
    filter: { labelKey, labelValue: labelValue || null, groupBy: groupBy || null },
    discoverUrl: '/api/ote/discover',
  }
})
