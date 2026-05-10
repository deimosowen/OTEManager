/**
 * Тот же порядок списка шаблонов, что на странице «Создание OTE»: личные → общие вашей группы → прочие общие.
 *
 * @param {any[]} list
 * @param {unknown} userGroupId
 */
export function sortTemplatesForCreate(list, userGroupId) {
  const gid = userGroupId != null && Number.isFinite(Number(userGroupId)) ? Math.trunc(Number(userGroupId)) : null
  /** @type {any[]} */
  const out = [...(list || [])]

  /** @type {(a: any, b: any) => number} */
  function nameCmp(a, b) {
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'ru')
  }

  /** @param {any} t */
  function sharedGroupKey(t) {
    const pv = String(t?.groupsPreview || '').trim()
    return pv ? pv : '\uf8ff — без ограничения группами'
  }

  /** @param {any} t */
  function tierShared(t) {
    const ids = Array.isArray(t?.groupIds) ? t.groupIds.map((x) => Math.trunc(Number(x))) : []
    const validIds = ids.filter((n) => Number.isInteger(n) && n > 0)
    if (gid != null && validIds.length && validIds.includes(gid)) return 0
    return 1
  }

  const personal = out.filter((t) => t?.isPersonal).sort(nameCmp)
  /** @type {any[]} */
  const shared = out.filter((t) => !t?.isPersonal)
  shared.sort((a, b) => {
    const ta = tierShared(a)
    const tb = tierShared(b)
    if (ta !== tb) return ta - tb
    const ka = sharedGroupKey(a)
    const kb = sharedGroupKey(b)
    const c = ka.localeCompare(kb, 'ru')
    if (c !== 0) return c
    return nameCmp(a, b)
  })
  return [...personal, ...shared]
}
