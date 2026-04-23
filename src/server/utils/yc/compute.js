import { instanceService, instance } from '@yandex-cloud/nodejs-sdk/compute-v1'
import { OTE_STATUS } from '@app-constants/ote.js'

const S = instance.Instance_Status

/**
 * @param {number} status
 */
export function mapYcInstanceStatusToOte(status) {
  if (status === S.RUNNING) return OTE_STATUS.RUNNING
  if (status === S.STOPPED) return OTE_STATUS.STOPPED
  if (status === S.DELETING) return OTE_STATUS.DELETING
  if (
    status === S.PROVISIONING ||
    status === S.STARTING ||
    status === S.RESTARTING ||
    status === S.UPDATING ||
    status === S.STOPPING
  ) {
    return OTE_STATUS.RUNNING
  }
  return OTE_STATUS.STOPPED
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 */
export function instanceMatchesLabelFilter(inst, labelKey, labelValue) {
  const labels = inst.labels || {}
  if (!Object.prototype.hasOwnProperty.call(labels, labelKey)) return false
  if (labelValue === undefined || labelValue === null || String(labelValue).trim() === '') return true
  return labels[labelKey] === String(labelValue).trim()
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk').Session} session
 * @param {string} folderId
 */
export async function listAllInstancesInFolder(session, folderId, view = instanceService.InstanceView.FULL) {
  const client = session.client(instanceService.InstanceServiceClient)
  const acc = []
  let pageToken = ''
  do {
    const res = await client.list(
      instanceService.ListInstancesRequest.fromPartial({
        folderId,
        pageSize: 1000,
        pageToken,
        filter: '',
        orderBy: 'name asc',
        view,
      }),
    )
    acc.push(...(res.instances || []))
    pageToken = res.nextPageToken || ''
  } while (pageToken)
  return acc
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk').Session} session
 * @param {string} instanceId
 */
export async function getInstanceFull(session, instanceId) {
  const client = session.client(instanceService.InstanceServiceClient)
  return client.get(
    instanceService.GetInstanceRequest.fromPartial({
      instanceId,
      view: instanceService.InstanceView.FULL,
    }),
  )
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 */
function mapInstanceToDetailRow(inst) {
  const boot = inst.bootDisk?.diskId ? `disk:${inst.bootDisk.diskId}` : '—'
  const statusName = instance.instance_StatusToJSON(inst.status)
  const pendingDelete = statusName === 'DELETING'
  return {
    name: inst.name,
    statusTag: pendingDelete ? 'pending_delete' : '',
    disksLabel: boot,
    instanceId: inst.id,
    recreationLabel: '—',
    ycStatus: statusName,
  }
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 */
function toIso(ts) {
  if (!ts) return new Date().toISOString()
  if (ts instanceof Date) return ts.toISOString()
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString()
  return new Date().toISOString()
}

/**
 * Одна строка списка из одной ВМ.
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 */
export function mapVmToListRow(inst) {
  const st = mapYcInstanceStatusToOte(inst.status)
  const ready = st === OTE_STATUS.RUNNING ? 1 : 0
  return {
    id: inst.id,
    mine: false,
    name: inst.name,
    product: inst.labels?.product || 'CaseOne',
    type: inst.labels?.type || inst.platformId || '—',
    status: st,
    instances: { ready, total: 1 },
    lastOperation: null,
    updatedAt: toIso(inst.createdAt),
    caseOneVersion: inst.labels?.['caseone-version'] || inst.labels?.caseone_version || '',
    history: [],
    lastBuild: null,
    instancesDetail: [mapInstanceToDetailRow(inst)],
    source: 'yc',
  }
}

/**
 * Группировка нескольких ВМ в одну строку (одна OTE — несколько инстансов).
 * @param {string} groupKey
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 */
export function mapGroupToListRow(groupKey, members) {
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name))
  const total = sorted.length
  const ready = sorted.filter((m) => mapYcInstanceStatusToOte(m.status) === OTE_STATUS.RUNNING).length
  const anyDeleting = sorted.some((m) => m.status === S.DELETING)
  const status = anyDeleting ? OTE_STATUS.DELETING : ready > 0 ? OTE_STATUS.RUNNING : OTE_STATUS.STOPPED
  const first = sorted[0]
  let latest = null
  for (const m of sorted) {
    const t = m.createdAt
    if (!t) continue
    const d = t instanceof Date ? t : typeof t.toDate === 'function' ? t.toDate() : null
    if (d && (!latest || d > latest)) latest = d
  }
  return {
    id: `grp:${encodeURIComponent(groupKey)}`,
    mine: false,
    name: groupKey || first.name,
    product: first.labels?.product || 'CaseOne',
    type: first.labels?.type || first.platformId || '—',
    status,
    instances: { ready, total },
    lastOperation: null,
    updatedAt: latest ? latest.toISOString() : toIso(first.createdAt),
    caseOneVersion: first.labels?.['caseone-version'] || '',
    history: [],
    lastBuild: null,
    instancesDetail: sorted.map(mapInstanceToDetailRow),
    source: 'yc',
    ycGroupKey: groupKey,
    ycMemberIds: sorted.map((m) => m.id),
  }
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 */
function preferAppMembersFirst(members) {
  const sorted = [...members].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
  const app = sorted.filter((m) => /-app$/i.test(m.name || ''))
  const rest = sorted.filter((m) => !/-app$/i.test(m.name || ''))
  return [...app, ...rest]
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string[]} keys
 */
function pickFirstLabelFromMembers(members, keys) {
  if (!keys.length) return ''
  for (const m of preferAppMembersFirst(members)) {
    const labels = m.labels || {}
    for (const k of keys) {
      const v = labels[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
    }
  }
  return ''
}

/**
 * @param {string} u
 */
function normalizeHttpUrl(u) {
  const s = String(u).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('//')) return `https:${s}`
  return `https://${s.replace(/^\/+/, '')}`
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string[]} keys
 */
function pickUrlFromLabelsMembers(members, keys) {
  for (const m of preferAppMembersFirst(members)) {
    const labels = m.labels || {}
    for (const k of keys) {
      const v = labels[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') return normalizeHttpUrl(String(v).trim())
    }
  }
  return ''
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string[]} keys
 */
function pickUrlFromMetaMembers(members, keys) {
  for (const m of preferAppMembersFirst(members)) {
    const meta = m.metadata || {}
    for (const k of keys) {
      const v = meta[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') return normalizeHttpUrl(String(v).trim())
    }
  }
  return ''
}

/**
 * Слаг для публичного URL: значение метки OTE (например metadata-tag) или имя ВМ без суффикса роли.
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string} labelKey
 */
function derivePublicAppSlug(members, labelKey) {
  const first = preferAppMembersFirst(members)[0]
  if (!first) return ''
  const lb = first.labels || {}
  if (labelKey && lb[labelKey] != null && String(lb[labelKey]).trim() !== '') return String(lb[labelKey]).trim()
  const name = first.name || ''
  return name.replace(/-(app|everything)$/i, '').trim() || name.trim()
}

/**
 * @param {string} template например https://{slug}.caseone.devpravo.tech
 * @param {string} slug
 */
function buildPublicUrlFromTemplate(template, slug) {
  const t = String(template || '').trim()
  const s = String(slug || '').trim()
  if (!t || !s) return ''
  const raw = t
    .replace(/\{slug\}/gi, s)
    .replace(/\{metadata-tag\}/gi, s)
    .replace(/\{ote\}/gi, s)
  return normalizeHttpUrl(raw)
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string[]} labelKeys
 * @param {string[]} metaKeys
 * @param {boolean} httpsFromFqdn
 * @param {{ publicUrlTemplate?: string, oteLabelKey?: string }} [extra]
 */
function buildAppUrlFromMembers(members, labelKeys, metaKeys, httpsFromFqdn, extra) {
  const fromL = pickUrlFromLabelsMembers(members, labelKeys)
  if (fromL) return fromL
  const fromM = pickUrlFromMetaMembers(members, metaKeys)
  if (fromM) return fromM
  const tpl = extra && String(extra.publicUrlTemplate || '').trim()
  if (tpl) {
    const slug = derivePublicAppSlug(members, extra.oteLabelKey || '')
    const built = buildPublicUrlFromTemplate(tpl, slug)
    if (built) return built
  }
  if (httpsFromFqdn) {
    for (const m of preferAppMembersFirst(members)) {
      const fq = m.fqdn && String(m.fqdn).trim()
      if (fq) return `https://${fq}`
    }
  }
  return ''
}

/** DD-MM-YYYY (TeamCity) → DD.MM.YYYY для UI */
function teamCityDateToRuDots(tc) {
  if (!tc) return ''
  const p = String(tc).split('-')
  if (p.length === 3 && /^\d{1,4}$/.test(p[2]))
    return `${p[0].padStart(2, '0')}.${p[1].padStart(2, '0')}.${p[2]}`
  return String(tc)
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string[]} deleteLabelKeys
 * @param {string[]} deleteMetaKeys
 */
function pickDeleteDateRuForGroup(members, deleteLabelKeys, deleteMetaKeys) {
  for (const m of preferAppMembersFirst(members)) {
    const tc = pickDeleteDateDisplay(m, deleteLabelKeys, deleteMetaKeys)
    if (tc) return teamCityDateToRuDots(tc)
  }
  return ''
}

/**
 * Имя ВМ часто содержит роль `-win-` / суффикс `-win` (YC `platformId` не равен «windows»).
 * @param {string} name
 */
function instanceNameSuggestsWindows(name) {
  const n = String(name || '').toLowerCase()
  if (!n) return false
  if (n.includes('windows')) return true
  // ...-win-app, ...-win-everything, win-...
  return /(^|[._-])win([._-]|$)/.test(n)
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 */
function inferOteOsKind(members) {
  const winInText = (s) => /\bwindows\b|win[_-]?server|microsoft windows/i.test(String(s || ''))

  for (const m of members || []) {
    if (/windows/i.test(String(m.platformId || ''))) return 'windows'
    if (instanceNameSuggestsWindows(m.name)) return 'windows'

    const labels = m.labels || {}
    const labelKeys = ['os', 'guest-os', 'guest_os', 'guest_os_id', 'os_family', 'image', 'type']
    for (const k of labelKeys) {
      if (winInText(labels[k])) return 'windows'
    }
    for (const [k, v] of Object.entries(labels)) {
      if (/os|guest|image|family|sku|platform|system|type|template|edition/i.test(k) && winInText(v))
        return 'windows'
    }
    const meta = m.metadata || {}
    for (const v of Object.values(meta)) {
      if (winInText(v)) return 'windows'
    }
  }
  return 'linux'
}

/**
 * Внутренний IP ВМ, где обычно крутится Rabbit (everything / не-app).
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 */
function pickRabbitIpFromMembers(members) {
  const list = [...(members || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
  const by = (re) => list.find((m) => re.test(m.name || ''))
  const vm = by(/everything/i) || by(/rabbit/i) || list.find((m) => !/-app$/i.test(m.name || '')) || list[0]
  return vm ? pickPrimaryInternalIp(vm) : ''
}

/**
 * Три ссылки CaseOne/Rabbit по правилам Win/Linux (хост из конфига).
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string} labelKey
 * @param {{ appLinksHost?: string, rabbitPort?: number }} [opts]
 * @returns {{ osKind: string, items: { key: string, label: string, href: string }[] }}
 */
export function buildOteAppLinkSet(members, labelKey, opts = {}) {
  const host = String(opts.appLinksHost || 'devpravo.tech')
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
  const port = Number(opts.rabbitPort) > 0 ? Number(opts.rabbitPort) : 15672
  const tag = derivePublicAppSlug(members, labelKey)
  if (!tag || !host) return { osKind: inferOteOsKind(members), items: [] }

  const t = String(tag).trim()
  const osKind = inferOteOsKind(members)
  const single = `https://${t}.${host}`
  const saasWin = `https://app-${t}.${host}`
  const rabbitIp = pickRabbitIpFromMembers(members)
  const rabbitHref = rabbitIp ? `http://${rabbitIp}:${port}` : ''

  /** @type {{ key: string, label: string, href: string }[]} */
  const items = []
  if (osKind === 'windows') {
    items.push({ key: 'single', label: 'Одиночный инстанс', href: single })
    items.push({ key: 'saas', label: 'SaaS', href: saasWin })
  } else {
    items.push({ key: 'single', label: 'Одиночный инстанс', href: single })
    items.push({ key: 'saas', label: 'SaaS', href: single })
  }
  if (rabbitHref) items.push({ key: 'rabbit', label: 'RabbitMQ', href: rabbitHref })

  return { osKind, items }
}

/**
 * «Мои окружения»: совпадение метки автора (run-by) с логином или почтой из сессии.
 * @param {string} runBy
 * @param {{ login?: string, email?: string } | null | undefined} actor
 */
export function computeOteRowMine(runBy, actor) {
  if (!actor) return false
  const rb = String(runBy || '').trim().toLowerCase()
  if (!rb) return false
  const login = String(actor.login || '').trim().toLowerCase()
  const email = String(actor.email || '').trim().toLowerCase()
  if (login && rb === login) return true
  if (email && rb === email) return true
  if (login) {
    const bs = rb.lastIndexOf('\\')
    if (bs >= 0 && rb.slice(bs + 1) === login) return true
    const at = rb.indexOf('@')
    if (at > 0 && rb.slice(0, at) === login) return true
  }
  return false
}

/**
 * MVP-поля для строки списка (одна или несколько ВМ).
 * @param {Record<string, unknown>} row
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {{
 *   authorLabelKey: string,
 *   deleteLabelKeys: string[],
 *   deleteMetaKeys: string[],
 *   versionBackendKeys: string[],
 *   versionFrontendKeys: string[],
 *   appUrlLabelKeys: string[],
 *   appUrlMetaKeys: string[],
 *   appHttpsFromFqdn: boolean,
 *   appPublicUrlTemplate?: string,
 * }} mvp
 * @param {string} labelKey ключ метки имени OTE (например metadata-tag)
 * @param {{ login?: string, email?: string } | null} [actor] текущий пользователь для флага `mine`
 */
export function attachMvpFields(row, members, mvp, labelKey, actor = null) {
  if (!mvp || !members.length) return row
  const first = members[0]
  const labels = first.labels || {}
  const oteName = (labelKey && labels[labelKey] && String(labels[labelKey]).trim()) || row.name || ''
  const runBy = mvp.authorLabelKey
    ? pickFirstLabelFromMembers(members, [mvp.authorLabelKey])
    : ''
  const deleteDate = pickDeleteDateRuForGroup(members, mvp.deleteLabelKeys, mvp.deleteMetaKeys)
  const versionBackend = pickFirstLabelFromMembers(members, mvp.versionBackendKeys)
  const versionFrontend = pickFirstLabelFromMembers(members, mvp.versionFrontendKeys)
  const appUrl = buildAppUrlFromMembers(
    members,
    mvp.appUrlLabelKeys,
    mvp.appUrlMetaKeys,
    Boolean(mvp.appHttpsFromFqdn),
    {
      publicUrlTemplate: mvp.appPublicUrlTemplate,
      oteLabelKey: labelKey,
    },
  )
  const linkSet = buildOteAppLinkSet(members, labelKey, {
    appLinksHost: mvp.appLinksHost,
    rabbitPort: mvp.rabbitManagementPort,
  })
  const mine = computeOteRowMine(runBy, actor)
  return {
    ...row,
    mine,
    oteName,
    runBy,
    deleteDate,
    versionBackend,
    versionFrontend,
    appUrl,
    appLinkOsKind: linkSet.osKind,
    appLinks: linkSet.items,
  }
}

/**
 * Сводка по каталогу: какие ключи меток и metadata встречаются (для настройки UI).
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} instances
 * @param {number} [maxSamples]
 */
export function aggregateDiscoveryFromInstances(instances, maxSamples = 3) {
  const labelKeySet = new Set()
  const metaKeySet = new Set()
  /** @type {Record<string, string[]>} */
  const labelSamples = {}
  /** @type {Record<string, string[]>} */
  const metaSamples = {}
  for (const inst of instances) {
    for (const k of Object.keys(inst.labels || {})) {
      labelKeySet.add(k)
      const v = inst.labels[k]
      if (v === undefined || v === null) continue
      const sv = String(v).trim()
      if (!sv) continue
      if (!labelSamples[k]) labelSamples[k] = []
      if (labelSamples[k].length < maxSamples && !labelSamples[k].includes(sv)) labelSamples[k].push(sv)
    }
    for (const k of Object.keys(inst.metadata || {})) {
      metaKeySet.add(k)
      const v = inst.metadata[k]
      if (v === undefined || v === null) continue
      const sv = String(v).trim().slice(0, 200)
      if (!sv) continue
      if (!metaSamples[k]) metaSamples[k] = []
      if (metaSamples[k].length < maxSamples && !metaSamples[k].includes(sv)) metaSamples[k].push(sv)
    }
  }
  return {
    labelKeys: [...labelKeySet].sort((a, b) => a.localeCompare(b, 'ru')),
    metadataKeys: [...metaKeySet].sort((a, b) => a.localeCompare(b, 'ru')),
    labelSamples,
    metaSamples,
  }
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} instances
 * @param {{ labelKey: string, labelValue?: string, groupByLabelKey?: string, mvp?: object, actor?: { login?: string, email?: string } }} opts
 */
export function filterAndBuildListRows(instances, opts) {
  const { labelKey, labelValue, groupByLabelKey, mvp, actor } = opts
  const filtered = instances.filter((i) => instanceMatchesLabelFilter(i, labelKey, labelValue))
  const withMvp = (row, mem) => (mvp ? attachMvpFields(row, mem, mvp, labelKey, actor || null) : { ...row, mine: computeOteRowMine(row.runBy, actor) })
  if (!groupByLabelKey || !String(groupByLabelKey).trim()) {
    return filtered.map((inst) => withMvp(mapVmToListRow(inst), [inst]))
  }
  const key = String(groupByLabelKey).trim()
  const groups = new Map()
  for (const inst of filtered) {
    const g = (inst.labels && inst.labels[key]) || inst.id
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push(inst)
  }
  return Array.from(groups.entries()).map(([gk, members]) => withMvp(mapGroupToListRow(gk, members), members))
}

/**
 * @param {string} [csv]
 * @returns {string[]}
 */
export function parseCommaSeparatedKeys(csv) {
  if (!csv || typeof csv !== 'string') return []
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 */
export function pickPrimaryInternalIp(inst) {
  const nics = inst.networkInterfaces || []
  const first = nics[0]
  return (first && first.primaryV4Address && first.primaryV4Address.address) || ''
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 */
export function pickCpuMemoryGb(inst) {
  const r = inst.resources
  const cores = Number(r && r.cores) || 0
  const memBytes = Number(r && r.memory) || 0
  const memoryGb = Math.round((memBytes / (1024 * 1024 * 1024)) * 10) / 10
  return { cores, memoryGb }
}

/**
 * @param {string} raw
 * @returns {Date | null}
 */
function parseFlexibleDate(raw) {
  const s = String(raw).trim()
  if (!s) return null
  const m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})/)
  if (m) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Дата в формате как в TeamCity: DD-MM-YYYY
 * @param {Date} d
 */
function formatTeamCityDate(d) {
  if (!d || Number.isNaN(d.getTime())) return ''
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 * @param {string[]} deleteLabelKeys
 * @param {string[]} deleteMetaKeys
 */
function pickDeleteDateDisplay(inst, deleteLabelKeys, deleteMetaKeys) {
  const labels = inst.labels || {}
  for (const k of deleteLabelKeys) {
    const raw = labels[k]
    if (raw !== undefined && raw !== null && String(raw).trim()) {
      const d = parseFlexibleDate(String(raw))
      return d ? formatTeamCityDate(d) : String(raw).trim()
    }
  }
  const meta = inst.metadata || {}
  for (const k of deleteMetaKeys) {
    const raw = meta[k]
    if (raw !== undefined && raw !== null && String(raw).trim()) {
      const d = parseFlexibleDate(String(raw))
      return d ? formatTeamCityDate(d) : String(raw).trim()
    }
  }
  return ''
}

/**
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 * @param {string[]} usernameLabelKeys
 */
function pickUsername(inst, usernameLabelKeys) {
  const labels = inst.labels || {}
  for (const k of usernameLabelKeys) {
    const v = labels[k]
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim()
  }
  return ''
}

/**
 * «Тег» окружения — значение метки отбора или имя ВМ без суффикса роли.
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 * @param {string} labelKey
 */
function pickOteTag(inst, labelKey) {
  const labels = inst.labels || {}
  if (labelKey && Object.prototype.hasOwnProperty.call(labels, labelKey)) {
    const v = labels[labelKey]
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim()
  }
  const name = inst.name || ''
  return name.replace(/-(app|everything)$/i, '') || name
}

/**
 * Плоская таблица в духе вывода TeamCity: пользователь → тег → строки ВМ + итоги и квоты.
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} filtered
 * @param {{
 *   labelKey: string,
 *   usernameLabelKeys: string[],
 *   deleteLabelKeys: string[],
 *   deleteMetaKeys: string[],
 *   quotaMaxCpu: number,
 *   quotaMaxMemoryGb: number,
 * }} opts
 */
export function buildTeamCityTable(filtered, opts) {
  const {
    labelKey,
    usernameLabelKeys,
    deleteLabelKeys,
    deleteMetaKeys,
    quotaMaxCpu,
    quotaMaxMemoryGb,
  } = opts

  const enriched = filtered.map((inst) => {
    const username = pickUsername(inst, usernameLabelKeys)
    const tag = pickOteTag(inst, labelKey)
    const { cores, memoryGb } = pickCpuMemoryGb(inst)
    const statusYc = instance.instance_StatusToJSON(inst.status) || 'UNKNOWN'
    return {
      inst,
      username,
      tag,
      vmName: inst.name || '',
      ip: pickPrimaryInternalIp(inst),
      statusYc,
      cores,
      memoryGb,
      deleteDate: pickDeleteDateDisplay(inst, deleteLabelKeys, deleteMetaKeys),
      instanceId: inst.id,
    }
  })

  const sortKey = (u, t, n) => [
    (u || '\uFFFF').toLowerCase(),
    (t || '\uFFFF').toLowerCase(),
    (n || '').toLowerCase(),
  ]

  enriched.sort((a, b) => {
    const ka = sortKey(a.username, a.tag, a.vmName)
    const kb = sortKey(b.username, b.tag, b.vmName)
    for (let i = 0; i < 3; i += 1) {
      const c = ka[i].localeCompare(kb[i], 'ru')
      if (c !== 0) return c
    }
    return 0
  })

  const rows = []
  let lastUser = null
  let lastTag = null

  for (const e of enriched) {
    if (e.username !== lastUser) {
      lastUser = e.username
      lastTag = null
      rows.push({
        kind: 'user',
        key: `u:${e.username || '—'}`,
        username: e.username || '—',
        tag: '',
        vmName: '',
        ip: '',
        statusYc: '',
        cores: null,
        memoryGb: null,
        deleteDate: '',
        instanceId: null,
      })
    }
    if (e.tag !== lastTag) {
      lastTag = e.tag
      rows.push({
        kind: 'tag',
        key: `t:${e.username || '—'}:${e.tag}`,
        username: '',
        tag: e.tag,
        vmName: '',
        ip: '',
        statusYc: '',
        cores: null,
        memoryGb: null,
        deleteDate: '',
        instanceId: null,
      })
    }
    rows.push({
      kind: 'vm',
      key: `v:${e.instanceId}`,
      username: '',
      tag: '',
      vmName: e.vmName,
      ip: e.ip,
      statusYc: e.statusYc,
      cores: e.cores,
      memoryGb: e.memoryGb,
      deleteDate: e.deleteDate,
      instanceId: e.instanceId,
    })
  }

  let totalCpu = 0
  let totalMem = 0
  for (const e of enriched) {
    totalCpu += e.cores
    totalMem += e.memoryGb
  }

  const maxCpu = Number.isFinite(quotaMaxCpu) && quotaMaxCpu > 0 ? quotaMaxCpu : 0
  const maxMem = Number.isFinite(quotaMaxMemoryGb) && quotaMaxMemoryGb > 0 ? quotaMaxMemoryGb : 0

  const summary = {
    totalCpu,
    totalMemoryGb: Math.round(totalMem * 100) / 100,
    quotaMaxCpu: maxCpu,
    quotaMaxMemoryGb: maxMem,
    cpuPercent: maxCpu ? Math.round((totalCpu / maxCpu) * 10000) / 100 : null,
    memoryPercent: maxMem ? Math.round((totalMem / maxMem) * 10000) / 100 : null,
    availableCpu: maxCpu ? Math.max(0, maxCpu - totalCpu) : null,
    availableMemoryGb: maxMem ? Math.max(0, Math.round((maxMem - totalMem) * 100) / 100) : null,
  }

  return { rows, summary }
}

/**
 * Метки ВМ в стабильном порядке для UI.
 * @param {Record<string, string> | undefined} labels
 * @returns {{ key: string, value: string }[]}
 */
export function labelsToSortedEntries(labels) {
  if (!labels || typeof labels !== 'object') return []
  return Object.keys(labels)
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .map((key) => ({
      key,
      value: labels[key] == null ? '' : String(labels[key]),
    }))
}

/**
 * По одной секции на каждую ВМ (имя, id, пары ключ–значение меток).
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 */
export function buildYcLabelSectionsFromInstances(members) {
  const sorted = [...members].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
  return sorted.map((m) => ({
    vmName: m.name || '',
    instanceId: m.id || '',
    entries: labelsToSortedEntries(m.labels),
  }))
}

/**
 * Расширенная карточка для страницы детали (Get FULL).
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 */
export function mapFullInstanceToEnvRow(inst) {
  const base = mapVmToListRow(inst)
  const nics = (inst.networkInterfaces || []).map((nic, idx) => ({
    index: idx,
    subnetId: nic.subnetId || '',
    primaryV4: nic.primaryV4Address?.address || '',
    natV4: nic.primaryV4Address?.oneToOneNat?.address || '',
    mac: nic.macAddress || '',
  }))
  const metaEntries = Object.entries(inst.metadata || {})
  base.cloudSummary = [
    { label: 'ID ВМ', value: inst.id },
    { label: 'Зона', value: inst.zoneId },
    { label: 'Платформа', value: inst.platformId },
    { label: 'FQDN', value: inst.fqdn || '—' },
    {
      label: 'Ресурсы',
      value: inst.resources
        ? `${inst.resources.cores || '?'} vCPU, ${Math.round((Number(inst.resources.memory) || 0) / (1024 * 1024 * 1024))} ГБ RAM`
        : '—',
    },
    { label: 'Описание', value: inst.description || '—' },
  ]
  base.ycLabelSections = buildYcLabelSectionsFromInstances([inst])
  if (metaEntries.length) {
    base.cloudSummary.push({ label: 'Метаданные (ключи)', value: metaEntries.map(([k]) => k).join(', ') })
  }
  base.cloudNetwork = nics
  base.cloudMetadata = inst.metadata || {}
  return base
}

/**
 * Строка «как в логе сборки ТС»: одна ВМ.
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance} inst
 * @param {{ deleteLabelKeys: string[], deleteMetaKeys: string[] }} mvp
 */
export function mapInstanceToBuildLogRow(inst, mvp) {
  const { cores, memoryGb } = pickCpuMemoryGb(inst)
  const nics = inst.networkInterfaces || []
  const nic0 = nics[0]
  const natIp = nic0?.primaryV4Address?.oneToOneNat?.address || ''
  return {
    name: inst.name || '',
    instanceId: inst.id || '',
    fqdn: inst.fqdn || '',
    zoneId: inst.zoneId || '',
    platformId: inst.platformId || '',
    ip: pickPrimaryInternalIp(inst),
    natIp,
    ycStatus: instance.instance_StatusToJSON(inst.status) || '',
    cores,
    memoryGb,
    deleteDate: pickDeleteDateRuForGroup([inst], mvp.deleteLabelKeys, mvp.deleteMetaKeys),
  }
}

/**
 * Текст конфигурации для CI: первый непустой metadata или метка из списков ключей.
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string[]} metaKeys
 * @param {string[]} labelKeys
 */
export function pickTcConfigFromMembers(members, metaKeys, labelKeys) {
  const first = preferAppMembersFirst(members)[0]
  if (!first) return ''
  for (const k of metaKeys || []) {
    const v = first.metadata?.[k]
    if (v != null && String(v).trim()) {
      const s = String(v).trim()
      try {
        return JSON.stringify(JSON.parse(s), null, 2)
      } catch {
        return s
      }
    }
  }
  const labels = first.labels || {}
  for (const k of labelKeys || []) {
    const v = labels[k]
    if (v != null && String(v).trim()) {
      const s = String(v).trim()
      try {
        return JSON.stringify(JSON.parse(s), null, 2)
      } catch {
        return s
      }
    }
  }
  return ''
}

/**
 * История развёртываний из metadata (JSON-массив или объект с полем history).
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string} metaKey
 */
export function parseDeploymentHistoryFromMembers(members, metaKey) {
  if (!metaKey || !String(metaKey).trim()) return []
  const raw = preferAppMembersFirst(members)[0]?.metadata?.[metaKey]
  if (raw == null || !String(raw).trim()) return []
  try {
    const j = JSON.parse(String(raw))
    const arr = Array.isArray(j) ? j : j?.history
    if (!Array.isArray(arr)) return []
    return arr.map((e) => ({
      at: e.at || e.time || e.deployedAt || '',
      versionBackend: e.versionBackend || e.backend || e.caseoneVersion || '',
      versionFrontend: e.versionFrontend || e.frontend || e.uiVersion || '',
      note: e.note || e.message || '',
    }))
  } catch {
    return []
  }
}

/**
 * Поля карточки OTE для UI: MVP + таблица ВМ + конфиг ТС + история (из метаданных при наличии).
 * @param {Record<string, unknown>} row
 * @param {import('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/compute/v1/instance').Instance[]} members
 * @param {string} labelKey
 * @param {Record<string, unknown>} mvp
 */
export function enrichOteDetailItem(row, members, labelKey, mvp, actor = null) {
  const merged = attachMvpFields({ ...row }, members, mvp, labelKey, actor)
  merged.vmBuildLogRows = members.map((inst) => mapInstanceToBuildLogRow(inst, mvp))
  merged.tcConfigText = pickTcConfigFromMembers(members, mvp.tcConfigMetaKeys || [], mvp.tcConfigLabelKeys || [])
  merged.deploymentHistory = parseDeploymentHistoryFromMembers(members, mvp.deploymentHistoryMetaKey || '')
  merged.source = 'yc'
  return merged
}
