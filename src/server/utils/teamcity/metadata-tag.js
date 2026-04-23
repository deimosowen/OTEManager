/**
 * Значение `metadata.tag` для TeamCity: как у MVP — сначала ВМ с суффиксом `-app`, иначе любая из группы.
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string} labelKey например `metadata-tag`
 */
export function pickMetadataTagFromMembers(members, labelKey) {
  if (!members?.length || !labelKey) return ''
  const sorted = [...members].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
  const prefer = [...sorted.filter((m) => /-app$/i.test(m.name || '')), ...sorted]
  for (const m of prefer) {
    const v = m.labels && m.labels[labelKey]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}
