import { inArray } from 'drizzle-orm'
import { oteAutomationScenarios } from '../db/schema.js'

/**
 * Кэш graph_json для тика расписания: большое поле не читаем из БД, пока updatedAt совпадает.
 * После срабатывания слота меняется только schedule_last_fired — updatedAt тот же, кэш валиден.
 * Любой PUT сценария обновляет updatedAt → промах и перечитывание; дополнительно сбрасываем запись на PUT/DELETE.
 */

/** @type {Map<number, { updatedAt: number, graphJson: string }>} */
const graphJsonByScenarioId = new Map()

/**
 * @param {unknown} scenarioId
 */
export function invalidateAutomationScheduleGraphCache(scenarioId) {
  const id = Math.trunc(Number(scenarioId))
  if (Number.isFinite(id) && id >= 1) graphJsonByScenarioId.delete(id)
}

export function invalidateAllAutomationScheduleGraphCache() {
  graphJsonByScenarioId.clear()
}

/**
 * @param {import('drizzle-orm').LibSQLDatabase} db
 * @param {{ id: unknown, updatedAt: unknown }[]} baseRows — строки без graph_json
 * @returns {Promise<Map<number, string>>}
 */
export async function loadGraphJsonForScheduleTick(db, baseRows) {
  /** @type {Map<number, string>} */
  const out = new Map()
  /** @type {number[]} */
  const missIds = []

  for (const r of baseRows) {
    const id = Math.trunc(Number(r.id))
    const ua = Number(r.updatedAt)
    if (!Number.isFinite(id) || id < 1 || !Number.isFinite(ua)) continue
    const hit = graphJsonByScenarioId.get(id)
    if (hit && hit.updatedAt === ua) {
      out.set(id, hit.graphJson)
    } else {
      missIds.push(id)
    }
  }

  const uniq = [...new Set(missIds)]
  if (uniq.length) {
    const fetched = await db
      .select({
        id: oteAutomationScenarios.id,
        graphJson: oteAutomationScenarios.graphJson,
        updatedAt: oteAutomationScenarios.updatedAt,
      })
      .from(oteAutomationScenarios)
      .where(inArray(oteAutomationScenarios.id, uniq))

    const seen = new Set()
    for (const row of fetched) {
      const id = Math.trunc(Number(row.id))
      const ua = Number(row.updatedAt)
      if (!Number.isFinite(id) || id < 1) continue
      seen.add(id)
      const gj = String(row.graphJson || '{}')
      graphJsonByScenarioId.set(id, { updatedAt: ua, graphJson: gj })
      out.set(id, gj)
    }
    for (const mid of uniq) {
      if (!seen.has(mid)) out.set(mid, '{}')
    }
  }

  return out
}
