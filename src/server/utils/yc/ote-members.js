import { runtimeConfigString } from './config-helpers.js'
import { instanceMatchesLabelFilter, listAllInstancesInFolder, resolveListGroupKey } from './compute.js'

/**
 * Все ВМ, входящие в эту OTE (одна ВМ по id или группа по `grp:` + метка группировки).
 * @param {import('@yandex-cloud/nodejs-sdk').Session} session
 * @param {string} folderId
 * @param {string} id id ВМ или `grp:…`
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 */
export async function listMemberInstancesForOteId(session, folderId, id, config) {
  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'
  const labelValue = runtimeConfigString(config.ycInstanceLabelValue, 'NUXT_YC_INSTANCE_LABEL_VALUE')
  const gb = runtimeConfigString(config.ycGroupByLabelKey, 'NUXT_YC_GROUP_BY_LABEL_KEY') || 'metadata-tag'
  const all = await listAllInstancesInFolder(session, folderId)
  if (id.startsWith('grp:')) {
    const groupKey = decodeURIComponent(id.slice(4))
    return all.filter((inst) => {
      if (!instanceMatchesLabelFilter(inst, labelKey, labelValue)) return false
      const gval = resolveListGroupKey(inst, labelKey, gb)
      return gval === groupKey
    })
  }
  const inst = all.find((i) => i.id === id)
  if (!inst || !instanceMatchesLabelFilter(inst, labelKey, labelValue)) return []
  return [inst]
}
