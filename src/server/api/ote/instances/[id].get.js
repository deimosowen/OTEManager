import { getDb } from '../../../db/client.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'
import { requireYcFolderIdForUser } from '../../../utils/yc/group-settings.js'
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
import { findBlockingOteTcCreationForMetadataTag } from '../../../utils/ote-tc-creation-guard.js'
import { fetchLatestSucceededOteTcCreationForMetadataTag } from '../../../utils/ote-tc-creation-latest-succeeded.js'
import { isOteResourceProtected } from '../../../utils/ote-protected.js'
import { resolveTcPendingState } from '../../../utils/ote-tc-pending.js'
import { pickMetadataTagFromMembers } from '../../../utils/teamcity/metadata-tag.js'
import { buildMvpOptsFromRuntimeConfig } from '../../../utils/yc/mvp-from-config.js'

/**
 * Можно ли поставить обновление через менеджер: нужна успешная сборка с тем же `metadata.tag`, чтобы взять `build_template_id`.
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {Record<string, unknown>} item
 * @param {string} metadataTag
 */
async function attachOteTcUpdateViaManager(db, item, metadataTag) {
  const tag = String(metadataTag || '').trim()
  item.oteTcUpdateViaManagerAvailable = false
  item.oteTcUpdateResolvedBuildTemplateId = null
  if (!tag) return
  try {
    const row = await fetchLatestSucceededOteTcCreationForMetadataTag(db, tag)
    const tid = row?.buildTemplateId != null ? Number(row.buildTemplateId) : NaN
    if (Number.isFinite(tid) && tid >= 1) {
      item.oteTcUpdateViaManagerAvailable = true
      item.oteTcUpdateResolvedBuildTemplateId = tid
    }
  } catch {
    /* оставляем false */
  }
}

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
  const db = getDb()
  const folderId = await requireYcFolderIdForUser(db, user)
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
    const metaTagGrp = pickMetadataTagFromMembers(filtered, labelKey)
    try {
      const hitGrp = metaTagGrp ? await findBlockingOteTcCreationForMetadataTag(getDb(), metaTagGrp) : null
      item.oteTcCreationBlocking = hitGrp
        ? {
            id: hitGrp.id,
            presetId: hitGrp.presetId != null ? String(hitGrp.presetId) : null,
            teamcityBuildId: hitGrp.teamcityBuildId,
            teamcityWebUrl: hitGrp.teamcityWebUrl,
          }
        : null
    } catch {
      item.oteTcCreationBlocking = null
    }
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
    item.protected = await isOteResourceProtected(db, id)
    await attachOteTcUpdateViaManager(getDb(), item, metaTagGrp)
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
  const metaTagVm = pickMetadataTagFromMembers([inst], labelKey)
  try {
    const hitVm = metaTagVm ? await findBlockingOteTcCreationForMetadataTag(getDb(), metaTagVm) : null
    item.oteTcCreationBlocking = hitVm
      ? {
          id: hitVm.id,
          presetId: hitVm.presetId != null ? String(hitVm.presetId) : null,
          teamcityBuildId: hitVm.teamcityBuildId,
          teamcityWebUrl: hitVm.teamcityWebUrl,
        }
      : null
  } catch {
    item.oteTcCreationBlocking = null
  }
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
  item.protected = await isOteResourceProtected(db, id)
  await attachOteTcUpdateViaManager(getDb(), item, metaTagVm)
  return { item }
})
