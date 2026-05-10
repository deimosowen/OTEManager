/** Настройки блока If/Else на холсте автоматизаций (ветки «Да» / «Нет» по данным каталога OTE). */

export const IF_ELSE_AUTHOR_OPTIONS = [
  { value: 'mine', label: 'Только мои среды (автор по метке группы)' },
  { value: 'any', label: 'Любые среды в каталоге группы' },
]

/** Фильтр по тегу окружения (как колонка Tag в списке OTE). */
export const IF_ELSE_TAG_SCOPE_OPTIONS = [
  { value: 'any', label: 'Любой тег' },
  { value: 'specific', label: 'Только указанный тег' },
]

export const IF_ELSE_MACHINE_OPTIONS = [
  { value: 'running', label: 'Есть работающая ВМ' },
  { value: 'stopped', label: 'Есть остановленная ВМ' },
  { value: 'exists', label: 'Среда есть в каталоге' },
  { value: 'missing', label: 'Среды нет в каталоге' },
]

const AUTHOR_SET = new Set(IF_ELSE_AUTHOR_OPTIONS.map((o) => o.value))
const TAG_SCOPE_SET = new Set(IF_ELSE_TAG_SCOPE_OPTIONS.map((o) => o.value))
const MACHINE_SET = new Set(IF_ELSE_MACHINE_OPTIONS.map((o) => o.value))

/**
 * @param {unknown} raw
 * @returns {{
 *   blockTitle: string,
 *   authorScope: string,
 *   tagScope: string,
 *   tagValue: string,
 *   machinePredicate: string,
 * }}
 */
export function normalizeIfElseConfig(raw) {
  const blockTitle = String(raw?.blockTitle ?? '').trim() || 'Условие'
  const authorScope = AUTHOR_SET.has(raw?.authorScope) ? raw.authorScope : 'mine'
  const tagScope = TAG_SCOPE_SET.has(raw?.tagScope) ? raw.tagScope : 'any'
  let tagValue = String(raw?.tagValue ?? '').trim()
  if (tagScope !== 'specific') tagValue = ''
  const machinePredicate = MACHINE_SET.has(raw?.machinePredicate) ? raw.machinePredicate : 'running'
  return { blockTitle, authorScope, tagScope, tagValue, machinePredicate }
}

/** Короткая строка под заголовком блока на холсте */
export function summarizeIfElseConfig(raw) {
  const c = normalizeIfElseConfig(raw)
  const author = c.authorScope === 'mine' ? 'мои среды' : 'любые среды'
  const tag =
    c.tagScope === 'specific' && c.tagValue ? `тег «${c.tagValue}»` : 'любой тег'
  const vm = {
    running: 'есть работающая ВМ',
    stopped: 'есть остановленная ВМ',
    exists: 'есть в каталоге',
    missing: 'нет в каталоге',
  }[c.machinePredicate] || 'состояние ВМ'
  return `${author} · ${tag} · ${vm}`
}
