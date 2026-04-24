/** Подписи статуса записи `ote_tc_creations` (создание OTE через TeamCity). */

export function oteTcCreationStatusLabel(s) {
  switch (s) {
    case 'queued':
      return 'В очереди'
    case 'running':
      return 'Выполняется'
    case 'succeeded':
      return 'Успешно'
    case 'failed':
      return 'Ошибка'
    default:
      return String(s || '—')
  }
}

export function oteTcCreationStatusClass(s) {
  if (s === 'succeeded') return 'text-emerald-700'
  if (s === 'failed') return 'text-rose-700'
  if (s === 'running' || s === 'queued') return 'text-amber-700'
  return 'text-slate-700'
}
