import { OTE_STATUS } from '@app-constants/ote.js'
import { normalizeIfElseConfig } from '@app-constants/automation-if-else.js'

/**
 * Строки каталога OTE после filterAndBuildListRows (одна строка = одна среда в списке).
 *
 * @param {Record<string, unknown>} row
 * @param {{ authorScope: string, tagScope: string, tagValue: string }} norm
 */
export function ifElseRowMatchesScope(row, norm) {
  if (norm.authorScope === 'mine' && !row.mine) return false
  if (norm.tagScope !== 'specific') return true
  const want = String(norm.tagValue || '').trim()
  if (!want) return false
  const cand = String(row.oteName || row.name || '').trim()
  return cand === want
}

/**
 * @param {unknown} cfg
 * @param {Record<string, unknown>[]} listRows
 * @returns {boolean} true → ветка «Да», false → «Нет»
 */
export function evaluateIfElseCondition(cfg, listRows) {
  const norm = normalizeIfElseConfig(cfg)
  const matched = (listRows || []).filter((row) => ifElseRowMatchesScope(row, norm))
  const p = norm.machinePredicate
  if (p === 'missing') return matched.length === 0
  if (p === 'exists') return matched.length > 0
  if (p === 'running') return matched.some((r) => r.status === OTE_STATUS.RUNNING)
  if (p === 'stopped') return matched.some((r) => r.status === OTE_STATUS.STOPPED)
  return false
}
