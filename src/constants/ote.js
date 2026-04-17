/** Статусы окружения в доменной модели */
export const OTE_STATUS = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  DELETING: 'deleting',
}

/** Подписи статусов для UI */
export const OTE_STATUS_LABELS = {
  [OTE_STATUS.RUNNING]: 'Работает',
  [OTE_STATUS.STOPPED]: 'Выключен',
  [OTE_STATUS.DELETING]: 'Удаляется',
}

/** Типы окружений при создании */
export const OTE_ENV_TYPES = [
  { id: 'astra-linux', name: 'Astra Linux', subtitle: 'Единое окружение Linux' },
  { id: 'win-single', name: 'Win Single', subtitle: 'Windows, одиночный' },
  { id: 'win-saas', name: 'Win SaaS', subtitle: 'Windows, SaaS' },
  { id: 'linux-single', name: 'Linux Single', subtitle: 'Linux, одиночный' },
  { id: 'linux-saas', name: 'Linux SaaS', subtitle: 'Linux, SaaS' },
]

export const FILTER_STATUS_OPTIONS = [
  { value: '', label: 'Статус' },
  { value: OTE_STATUS.RUNNING, label: OTE_STATUS_LABELS[OTE_STATUS.RUNNING] },
  { value: OTE_STATUS.STOPPED, label: OTE_STATUS_LABELS[OTE_STATUS.STOPPED] },
  { value: OTE_STATUS.DELETING, label: OTE_STATUS_LABELS[OTE_STATUS.DELETING] },
]

