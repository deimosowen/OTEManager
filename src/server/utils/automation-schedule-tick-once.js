import { eq } from 'drizzle-orm'
import { oteAutomationScenarios } from '../db/schema.js'
import { loadGraphJsonForScheduleTick } from './automation-schedule-graph-cache.js'
import { fetchDirectoryUserByKey } from './automation-schedule-actor.js'
import {
  computeScheduleSlotKeyUtc,
  isWallClockMatchingSchedule,
  parseScheduleLastFiredMap,
  resolveScheduleTimezoneForFire,
} from './automation-schedule-eval.js'
import { runManualAutomationFromNode } from './automation-run-manual.js'

/**
 * Один проход: сценарии с `enabled = 1` и узлом trigger/schedule (отключённые в БД не выбираются).
 * Лёгкий список включённых сценариев + кэш `graph_json` по `(id, updated_at)` между тиками;
 * антидребезг слотов обновляет только `schedule_last_fired`, поэтому граф можно не перечитывать каждый раз.
 *
 * @param {{
 *   db: import('drizzle-orm').LibSQLDatabase,
 *   config: import('@nuxt/schema').NitroRuntimeConfig,
 *   nowMs?: number,
 * }} opts
 */
export async function runAutomationScheduleTickOnce(opts) {
  const { db, config } = opts
  const now = typeof opts.nowMs === 'number' && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now()
  /** Кэш isdayoff.ru на один тик: один запрос на пару дата+пояс. */
  const isDayOffCache = new Map()

  const baseRows = await db
    .select({
      id: oteAutomationScenarios.id,
      scheduleLastFiredByNodeJson: oteAutomationScenarios.scheduleLastFiredByNodeJson,
      updatedByUserKey: oteAutomationScenarios.updatedByUserKey,
      updatedAt: oteAutomationScenarios.updatedAt,
    })
    .from(oteAutomationScenarios)
    .where(eq(oteAutomationScenarios.enabled, 1))

  const graphById = await loadGraphJsonForScheduleTick(db, baseRows)

  for (const row of baseRows) {
    const sid = Math.trunc(Number(row.id))
    const graphJson = graphById.get(sid) ?? '{}'
    let graph = { nodes: [], edges: [] }
    try {
      const parsed = JSON.parse(String(graphJson || '{}'))
      graph = {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      }
    } catch {
      continue
    }

    const triggers = graph.nodes.filter(
      (n) => n?.data?.kind === 'trigger' && n?.data?.variant === 'schedule',
    )
    if (!triggers.length) continue

    const firedMap = parseScheduleLastFiredMap(row.scheduleLastFiredByNodeJson)

    for (const node of triggers) {
      const nodeId = String(node.id || '')
      if (!nodeId) continue
      const cfg = node.data?.config && typeof node.data.config === 'object' ? node.data.config : {}

      let tz
      try {
        tz = await resolveScheduleTimezoneForFire(db, cfg, row.updatedByUserKey)
      } catch (e) {
        console.error('[automation-schedule] timezone', row.id, e)
        continue
      }

      if (!(await isWallClockMatchingSchedule(now, tz, cfg, { isDayOffCache }))) continue

      let slotKey
      try {
        slotKey = computeScheduleSlotKeyUtc(now, tz)
      } catch (e) {
        console.error('[automation-schedule] slot', row.id, nodeId, e)
        continue
      }
      if (!slotKey) continue
      if (firedMap[nodeId] === slotKey) continue

      const actor = await fetchDirectoryUserByKey(db, row.updatedByUserKey)
      if (!actor || (!actor.login && !actor.email)) {
        console.warn('[automation-schedule] нет пользователя каталога для сценария', row.id)
        continue
      }

      const scenarioRow = { graphJson }
      try {
        await runManualAutomationFromNode({ db, config, user: actor }, scenarioRow, nodeId)
      } catch (e) {
        console.error('[automation-schedule] run failed', row.id, nodeId, e)
        continue
      }

      firedMap[nodeId] = slotKey
      try {
        await db
          .update(oteAutomationScenarios)
          .set({ scheduleLastFiredByNodeJson: JSON.stringify(firedMap) })
          .where(eq(oteAutomationScenarios.id, row.id))
      } catch (e) {
        console.error('[automation-schedule] не удалось записать слот', row.id, e)
      }
    }
  }
}
