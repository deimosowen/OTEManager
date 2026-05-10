import { normalizeWaitTeamCityConfig } from '@app-constants/automation-wait-teamcity.js'
import { OTE_STATUS } from '@app-constants/ote.js'
import { validateAutomationGraph } from '@app-utils/automation-graph.js'
import { createError } from 'h3'
import { eq } from 'drizzle-orm'
import { oteBuildTemplates } from '../db/schema.js'
import { evaluateIfElseCondition } from './automation-if-else-eval.js'
import { buildTemplateIdVisibleToViewer, resolveBuildTemplateViewer } from './build-template-access.js'
import { integrationUserKey } from './integrations/user-credentials.js'
import { mergeParamsFromTemplateAndOverrides, queueOteTcJobFromBuildTemplate } from './ote-build-template-queue.js'
import { OTE_TC_PRESET_BUILD_TEMPLATE } from './ote-tc-job-audit.js'
import { queueOteTeamCityStartStopBuild } from './ote-teamcity-queue-power.js'
import { fetchTeamCityGroupSettingsByUserKey } from './teamcity/group-settings.js'
import { isTeamCityAuthAvailable, resolveTeamCityAuthorizationHeader } from './teamcity/resolve-auth.js'
import { waitForTeamCityBuildsOutcome } from './teamcity/wait-build-complete.js'
import { insertAutomationBellNotification } from './user-notifications.js'
import { filterAndBuildListRows, listAllInstancesInFolder } from './yc/compute.js'
import { runtimeConfigString } from './yc/config-helpers.js'
import { requireYcFolderIdForUser } from './yc/group-settings.js'
import { buildMvpOptsFromRuntimeConfig } from './yc/mvp-from-config.js'
import { createYandexCloudSession } from './yc/session.js'

/**
 * DFS preorder по исходящим рёбрам от стартового узла (граф без циклов).
 * @param {string} startId
 * @param {{ source?: string, target?: string }[]} edges
 */
export function reachableNodesPreorder(startId, edges) {
  /** @type {Map<string, string[]>} */
  const adj = new Map()
  for (const e of edges || []) {
    const s = String(e.source || '')
    const t = String(e.target || '')
    if (!s || !t) continue
    if (!adj.has(s)) adj.set(s, [])
    adj.get(s).push(t)
  }
  /** @type {string[]} */
  const order = []
  const seen = new Set()
  function dfs(u) {
    if (seen.has(u)) return
    seen.add(u)
    order.push(u)
    const outs = [...(adj.get(u) || [])].sort()
    for (const v of outs) dfs(v)
  }
  dfs(String(startId))
  return order
}

/**
 * @param {Record<string, unknown>} row
 * @param {'start' | 'stop'} tcAction
 */
function vmPowerSkipReason(row, tcAction) {
  const st = row.status
  const ready = Number(row.instances?.ready ?? 0)
  const total = Number(row.instances?.total ?? 0)
  if (st === OTE_STATUS.DELETING) return 'deleting'
  if (tcAction === 'start' && total > 0 && ready === total) return 'already_running'
  if (tcAction === 'stop' && ready === 0) return 'already_stopped'
  return null
}

/**
 * Обход от узла-триггера (`manual` или `schedule`): уведомления, ветки If/Else по каталогу YC,
 * постановка и ожидание сборок TeamCity (создание из шаблона, старт/стоп «моих» OTE), ветки If/Else и «Ожидание TC».
 *
 * @param {{
 *   db: import('drizzle-orm').LibSQLDatabase,
 *   config: import('@nuxt/schema').NitroRuntimeConfig,
 *   user: { login?: string, email?: string, id?: string },
 * }} deps
 * @param {{ graphJson: string }} scenarioRow
 * @param {string} startNodeId id узла Vue Flow
 */
export async function runManualAutomationFromNode(deps, scenarioRow, startNodeId) {
  const { db, config, user } = deps
  const userKey = integrationUserKey(user)
  if (!userKey) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя' })
  }

  let graph = { nodes: [], edges: [] }
  try {
    const parsed = JSON.parse(String(scenarioRow.graphJson || '{}'))
    graph = {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    }
  } catch {
    throw createError({ statusCode: 400, message: 'Некорректный JSON графа сценария' })
  }

  const v = validateAutomationGraph(graph.nodes, graph.edges)
  if (!v.ok) {
    throw createError({
      statusCode: 400,
      message: v.errors[0] || 'Сценарий не прошёл проверку',
      data: { errors: v.errors },
    })
  }

  /** @type {Map<string, object>} */
  const byId = new Map(graph.nodes.map((n) => [String(n.id), n]))
  const start = byId.get(String(startNodeId))
  const d = start?.data
  const variant = d.variant
  if (!d || d.kind !== 'trigger' || (variant !== 'manual' && variant !== 'schedule')) {
    throw createError({
      statusCode: 400,
      message: 'Указанный блок не является триггером ручного запуска или расписания',
    })
  }

  let bellCount = 0
  /** @type {Array<Record<string, unknown>>} */
  const mineVmPower = []
  /** @type {Array<Record<string, unknown>>} */
  const createTemplateRuns = []

  /** Снимок каталога для If/Else и для блоков питания (один запрос list на запуск сценария). */
  /** @type {unknown[]} */
  let cachedAllInstances = []
  let cachedListRows = /** @type {Record<string, unknown>[]} */ ([])

  const needsCatalogSnapshot = graph.nodes.some((n) => {
    const k = n?.data?.kind
    const v = n?.data?.variant
    return (
      (k === 'condition' && v === 'if_else') ||
      (k === 'action' && (v === 'start_mine' || v === 'stop_mine'))
    )
  })

  /** @type {null | { folderId: string, session: import('@yandex-cloud/nodejs-sdk').Session }} */
  let ycFolderSession = null

  async function ensureYcFolderSession() {
    if (ycFolderSession) return ycFolderSession
    const folderId = await requireYcFolderIdForUser(db, user)
    const session = createYandexCloudSession(config)
    if (!session) {
      throw createError({ statusCode: 503, message: 'Не настроен ключ сервисного аккаунта YC' })
    }
    ycFolderSession = { folderId, session }
    return ycFolderSession
  }

  /** Кэш TeamCity поверх каталога YC. */
  /** @type {null | { folderId: string, session: import('@yandex-cloud/nodejs-sdk').Session, authorization: string, tcBase: string, g: NonNullable<Awaited<ReturnType<typeof fetchTeamCityGroupSettingsByUserKey>>> }} */
  let powerCtx = null

  async function ensurePowerCtx() {
    if (powerCtx) return powerCtx
    const { folderId, session } = await ensureYcFolderSession()
    if (!(await isTeamCityAuthAvailable(config, { user }))) {
      throw createError({
        statusCode: 503,
        message: 'TeamCity недоступен: добавьте персональный токен в профиле (раздел «Интеграции»).',
      })
    }
    const g = await fetchTeamCityGroupSettingsByUserKey(db, userKey)
    if (!g?.tcRestBaseUrl) {
      throw createError({
        statusCode: 503,
        message:
          'Для вашей группы не задан URL REST TeamCity. Администратор может настроить это в разделе «Система».',
      })
    }
    const authorization = await resolveTeamCityAuthorizationHeader(config, { user })
    powerCtx = { folderId, session, authorization, tcBase: g.tcRestBaseUrl, g }
    return powerCtx
  }

  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'
  const labelValue = runtimeConfigString(config.ycInstanceLabelValue, 'NUXT_YC_INSTANCE_LABEL_VALUE')
  const groupBy =
    runtimeConfigString(config.ycGroupByLabelKey, 'NUXT_YC_GROUP_BY_LABEL_KEY') || 'metadata-tag'
  const mvp = buildMvpOptsFromRuntimeConfig(config)

  if (needsCatalogSnapshot) {
    const yc = await ensureYcFolderSession()
    cachedAllInstances = await listAllInstancesInFolder(yc.session, yc.folderId)
    cachedListRows = filterAndBuildListRows(cachedAllInstances, {
      labelKey,
      labelValue,
      groupByLabelKey: groupBy || null,
      mvp,
      actor: { login: user.login || '', email: user.email || '' },
    })
  }

  /** Id сборок TeamCity от последнего выполненного TC-действия (для блока «Ожидание»). */
  /** @type {string[]} */
  let pendingTcBuildIds = []

  function replacePendingTcBuildIds(ids) {
    pendingTcBuildIds = [...new Set((ids || []).map(String).map((x) => x.trim()).filter(Boolean))]
  }

  function takePendingTcBuildIdsForWait() {
    const x = [...pendingTcBuildIds]
    pendingTcBuildIds = []
    return x
  }

  /** @type {Set<string>} */
  const visitedRun = new Set()
  /** @type {Array<Record<string, unknown>>} */
  const waitTeamCityRuns = []

  /**
   * @param {unknown} h
   */
  function sourceHandleNorm(h) {
    if (h == null) return ''
    const s = String(h).trim()
    if (s === '' || s === 'null' || s === 'undefined') return ''
    return s
  }

  /**
   * @param {string} nodeId
   * @param {'default' | 'branch'} mode
   * @param {string | null} branchHandle
   */
  async function followOutgoing(nodeId, mode, branchHandle) {
    let outs = (graph.edges || []).filter((e) => String(e.source) === nodeId)
    if (mode === 'branch' && branchHandle) {
      outs = outs.filter((e) => sourceHandleNorm(e.sourceHandle) === branchHandle)
    } else {
      outs = outs.filter((e) => !sourceHandleNorm(e.sourceHandle))
    }
    const targets = [...new Set(outs.map((e) => String(e.target)))].sort()
    for (const t of targets) await visitNode(t)
  }

  /**
   * @param {string} nodeId
   * @param {object} nd
   */
  async function runWaitTeamCityBlock(nodeId, nd) {
    const cfg = nd.config && typeof nd.config === 'object' ? nd.config : {}
    const { timeoutMinutes } = normalizeWaitTeamCityConfig(cfg)
    const buildIds = takePendingTcBuildIdsForWait()
    if (!buildIds.length) {
      waitTeamCityRuns.push({
        nodeId,
        branch: 'failure',
        buildIds: [],
        ok: false,
        error:
          'Нет сборки TeamCity для ожидания: перед этим блоком должно быть действие с постановкой сборки.',
      })
      return 'failure'
    }
    try {
      const ctx = await ensurePowerCtx()
      const out = await waitForTeamCityBuildsOutcome({
        buildIds,
        baseUrl: ctx.tcBase,
        authorization: ctx.authorization,
        timeoutMs: timeoutMinutes * 60 * 1000,
        pollMs: 4000,
      })
      const branch = out.allSuccess ? 'success' : 'failure'
      waitTeamCityRuns.push({
        nodeId,
        branch,
        buildIds,
        ok: out.allSuccess,
        reason: out.reason,
      })
      return branch
    } catch (err) {
      waitTeamCityRuns.push({
        nodeId,
        branch: 'failure',
        buildIds,
        ok: false,
        error: err?.message || String(err),
      })
      return 'failure'
    }
  }

  /**
   * @param {string} nodeId
   */
  async function visitNode(nodeId) {
    const id = String(nodeId)
    if (visitedRun.has(id)) return
    visitedRun.add(id)

    const n = byId.get(id)
    const nd = n?.data
    if (!nd) return

    const kind = nd.kind
    const variant = nd.variant

    if (kind === 'trigger') {
      await followOutgoing(id, 'default', null)
      return
    }
    if (kind === 'condition' && variant === 'if_else') {
      const cfg = nd.config && typeof nd.config === 'object' ? nd.config : {}
      const yes = evaluateIfElseCondition(cfg, cachedListRows)
      await followOutgoing(id, 'branch', yes ? 'yes' : 'no')
      return
    }
    if (kind === 'wait' && variant === 'teamcity_build') {
      const branch = await runWaitTeamCityBlock(id, nd)
      await followOutgoing(id, 'branch', branch)
      return
    }
    if (kind === 'action') {
      await executeActionBlock(id, /** @type {object} */ (n))
      await followOutgoing(id, 'default', null)
      return
    }
  }

  /**
   * @param {string} nodeId
   * @param {object} n
   */
  async function executeActionBlock(nodeId, n) {
    const nd = n.data

    if (nd.variant === 'notify_bell') {
      const cfg = nd.config && typeof nd.config === 'object' ? nd.config : {}
      const inserted = await insertAutomationBellNotification(userKey, {
        title: cfg.title,
        body: cfg.body,
        href: cfg.href,
      })
      if (inserted) bellCount += 1
      return
    }

    if (nd.variant === 'create_template') {
      const cfg = nd.config && typeof nd.config === 'object' ? nd.config : {}
      const bid = Number(cfg.buildTemplateId)
      replacePendingTcBuildIds([])
      if (!Number.isFinite(bid) || bid < 1) {
        createTemplateRuns.push({
          nodeId,
          ok: false,
          error: 'Не выбран шаблон. Откройте блок и выберите шаблон из списка.',
        })
        return
      }
      if (!(await isTeamCityAuthAvailable(config, { user }))) {
        createTemplateRuns.push({
          nodeId,
          ok: false,
          error: 'TeamCity недоступен: добавьте персональный токен в профиле (раздел «Интеграции»).',
        })
        return
      }
      const viewer = await resolveBuildTemplateViewer(db, config, user)
      if (!viewer?.userKey) {
        createTemplateRuns.push({
          nodeId,
          ok: false,
          error: 'Не удалось проверить доступ к шаблонам.',
        })
        return
      }
      const allowed = await buildTemplateIdVisibleToViewer(db, bid, viewer)
      if (!allowed) {
        createTemplateRuns.push({
          nodeId,
          ok: false,
          error: 'Нет доступа к выбранному шаблону для вашей группы каталога.',
        })
        return
      }
      const tplRows = await db.select().from(oteBuildTemplates).where(eq(oteBuildTemplates.id, bid)).limit(1)
      const tplRow = tplRows[0]
      if (!tplRow) {
        createTemplateRuns.push({ nodeId, ok: false, error: 'Шаблон не найден.' })
        return
      }
      const merged = mergeParamsFromTemplateAndOverrides(tplRow.paramsJson, cfg.paramOverrides)
      try {
        const { created, tc } = await queueOteTcJobFromBuildTemplate({
          user,
          config,
          buildTemplateId: bid,
          mergedParams: merged,
          presetId: OTE_TC_PRESET_BUILD_TEMPLATE,
          renderedYamlOverride: null,
        })
        const bidTc = tc?.buildId ? String(tc.buildId).trim() : ''
        replacePendingTcBuildIds(bidTc ? [bidTc] : [])
        createTemplateRuns.push({
          nodeId,
          ok: true,
          creationId: created?.id ?? null,
          teamCityBuildId: tc?.buildId ?? null,
        })
      } catch (err) {
        const code = typeof err?.statusCode === 'number' ? err.statusCode : undefined
        createTemplateRuns.push({
          nodeId,
          ok: false,
          statusCode: code,
          error: err?.message || String(err),
        })
      }
      return
    }

    if (nd.variant !== 'start_mine' && nd.variant !== 'stop_mine') return

    const tcAction = nd.variant === 'start_mine' ? 'start' : 'stop'
    const ctx = await ensurePowerCtx()
    const all = needsCatalogSnapshot ? cachedAllInstances : await listAllInstancesInFolder(ctx.session, ctx.folderId)
    const items = needsCatalogSnapshot
      ? cachedListRows
      : filterAndBuildListRows(all, {
          labelKey,
          labelValue,
          groupByLabelKey: groupBy || null,
          mvp,
          actor: { login: user.login || '', email: user.email || '' },
        })
    const mineRows = items.filter((row) => row.mine)
    const buildTypeId = tcAction === 'start' ? ctx.g.startBuildTypeId : ctx.g.stopBuildTypeId

    /** @type {Array<Record<string, unknown>>} */
    const stepResults = []

    if (!buildTypeId) {
      for (const row of mineRows) {
        stepResults.push({
          oteResourceId: row.id,
          ok: false,
          error: 'Для вашей группы не задан buildTypeId для этой операции в настройках.',
        })
      }
      mineVmPower.push({ nodeId, variant: nd.variant, results: stepResults })
      replacePendingTcBuildIds([])
      return
    }

    for (const row of mineRows) {
      const skip = vmPowerSkipReason(row, tcAction)
      if (skip) {
        stepResults.push({ oteResourceId: row.id, ok: true, skipped: true, reason: skip })
        continue
      }
      try {
        const rc = await queueOteTeamCityStartStopBuild({
          db,
          config,
          user,
          folderId: ctx.folderId,
          session: ctx.session,
          oteResourceId: String(row.id),
          action: tcAction,
          tcRestBaseUrl: ctx.tcBase,
          buildTypeId,
          authorization: ctx.authorization,
          preloadedInstances: all,
        })
        stepResults.push({
          oteResourceId: row.id,
          ok: true,
          metadataTag: rc.metadataTag,
          teamCityBuildId: rc.teamCity?.buildId ?? null,
        })
      } catch (err) {
        const code = typeof err?.statusCode === 'number' ? err.statusCode : undefined
        stepResults.push({
          oteResourceId: row.id,
          ok: false,
          statusCode: code,
          error: err?.message || String(err),
        })
      }
    }

    mineVmPower.push({ nodeId, variant: nd.variant, results: stepResults })
    replacePendingTcBuildIds(
      stepResults
        .filter((r) => r.ok && !r.skipped && r.teamCityBuildId)
        .map((r) => String(r.teamCityBuildId)),
    )
  }

  await visitNode(String(startNodeId))

  return {
    ok: true,
    visited: visitedRun.size,
    bellNotifications: bellCount,
    mineVmPower,
    createTemplateRuns,
    waitTeamCityRuns,
  }
}
