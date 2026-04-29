import { getDb } from '../../../db/client.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'
import {
  fetchLatestOteTcCreationSummaryByMetadataTag,
  fetchLatestTcYamlForOteMetadataTag,
} from '../../../utils/ote-tc-config-from-db.js'
import { runtimeConfigString } from '../../../utils/yc/config-helpers.js'
import { createYandexCloudSession } from '../../../utils/yc/session.js'
import {
  buildYcLabelSectionsFromInstances,
  enrichOteDetailItem,
  getInstanceFull,
  instanceMatchesLabelFilter,
  listAllInstancesInFolder,
  mapFullInstanceToEnvRow,
  mapGroupToListRow,
  resolveListGroupKey,
} from '../../../utils/yc/compute.js'
import { resolveTcPendingState } from '../../../utils/ote-tc-pending.js'
import { buildMvpOptsFromRuntimeConfig } from '../../../utils/yc/mvp-from-config.js'

/**
 * Детальная информация по одной ВМ (GetInstance FULL) или по группе `grp:<ключ>`.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Не указан id' })
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
  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'
  const mvp = buildMvpOptsFromRuntimeConfig(config)

  if (id.startsWith('grp:')) {
    const groupKey = decodeURIComponent(id.slice(4))
    const gb = runtimeConfigString(config.ycGroupByLabelKey, 'NUXT_YC_GROUP_BY_LABEL_KEY') || 'metadata-tag'
    const labelValue = runtimeConfigString(config.ycInstanceLabelValue, 'NUXT_YC_INSTANCE_LABEL_VALUE')
    const all = await listAllInstancesInFolder(session, folderId)
    const filtered = all.filter((inst) => {
      if (!instanceMatchesLabelFilter(inst, labelKey, labelValue)) return false
      const gval = resolveListGroupKey(inst, labelKey, gb)
      return gval === groupKey
    })
    if (!filtered.length) {
      throw createError({ statusCode: 404, message: 'Группа OTE не найдена' })
    }
    const row = mapGroupToListRow(groupKey, filtered)
    row.ycLabelSections = buildYcLabelSectionsFromInstances(filtered)
    const item = enrichOteDetailItem(row, filtered, labelKey, mvp)
    const pend = await resolveTcPendingState(id, filtered, config)
    item.tcOperationPending = pend || null
    const tag = String(item.oteName || groupKey || '').trim()
    if (tag) {
      try {
        const db = getDb()
        if (!String(item.tcConfigText || '').trim()) {
          const yaml = await fetchLatestTcYamlForOteMetadataTag(db, tag)
          if (yaml) item.tcConfigText = yaml
        }
        item.oteTcCreationSummary = await fetchLatestOteTcCreationSummaryByMetadataTag(db, tag)
      } catch {
        item.oteTcCreationSummary = null
      }
    } else {
      item.oteTcCreationSummary = null
    }
    return { item }
  }

  const inst = await getInstanceFull(session, id)
  if (!inst || inst.folderId !== folderId) {
    throw createError({ statusCode: 404, message: 'ВМ не найдена' })
  }
  const labels = inst.labels || {}
  if (!Object.prototype.hasOwnProperty.call(labels, labelKey)) {
    throw createError({ statusCode: 404, message: 'ВМ не относится к OTE (нет нужной метки)' })
  }
  const v = runtimeConfigString(config.ycInstanceLabelValue, 'NUXT_YC_INSTANCE_LABEL_VALUE')
  if (v && labels[labelKey] !== v) {
    throw createError({ statusCode: 404, message: 'ВМ не относится к OTE (значение метки)' })
  }

  const base = mapFullInstanceToEnvRow(inst)
  const item = enrichOteDetailItem(base, [inst], labelKey, mvp, { login: user.login || '', email: user.email || '' })
  const pend = await resolveTcPendingState(id, [inst], config)
  item.tcOperationPending = pend || null
  const tag = String(item.oteName || labels[labelKey] || '').trim()
  if (tag) {
    try {
      const db = getDb()
      if (!String(item.tcConfigText || '').trim()) {
        const yaml = await fetchLatestTcYamlForOteMetadataTag(db, tag)
        if (yaml) item.tcConfigText = yaml
      }
      item.oteTcCreationSummary = await fetchLatestOteTcCreationSummaryByMetadataTag(db, tag)
    } catch {
      item.oteTcCreationSummary = null
    }
  } else {
    item.oteTcCreationSummary = null
  }
  return { item }
})
