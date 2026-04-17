import { OTE_STATUS } from '~/constants/ote'

/** Начальные данные для UI до подключения API */
export function createSeedEnvironments() {
  return [
    {
      id: '1',
      mine: true,
      name: 'ote-dev-1931',
      product: 'CaseOne',
      type: 'Linux Single',
      status: OTE_STATUS.RUNNING,
      instances: { ready: 2, total: 2 },
      lastOperation: { kind: 'start', label: 'Старт' },
      updatedAt: '2024-12-23T10:00:00.000Z',
      caseOneVersion: '2.31',
      history: [
        { at: '2024-12-23T10:00:00.000Z', text: 'Запуск окружения (user1)' },
        { at: '2024-12-22T14:30:00.000Z', text: 'Создание окружения (user1)' },
      ],
      lastBuild: { ok: true, id: '123345', label: 'Успешный старт' },
      instancesDetail: [
        {
          name: 'Основной',
          statusTag: 'pending_delete',
          disksLabel: '24h slicing',
          instanceId: 'i-0a1b2c3d4e5f',
          recreationLabel: 'Пересоздание',
        },
      ],
    },
    {
      id: '2',
      mine: false,
      name: 'ote-qa-1943',
      product: 'CaseOne',
      type: 'Linux SaaS',
      status: OTE_STATUS.DELETING,
      instances: { ready: 2, total: 3 },
      lastOperation: { kind: 'stop', label: 'Стоп' },
      updatedAt: '2024-11-15T09:12:00.000Z',
      caseOneVersion: '2.30',
      history: [{ at: '2024-11-15T09:12:00.000Z', text: 'Запрос на удаление (user2)' }],
      lastBuild: { ok: true, id: '119900', label: 'Успешный старт' },
      instancesDetail: [],
    },
    {
      id: '3',
      mine: true,
      name: 'ote-demo-single',
      product: 'CaseOne',
      type: 'Linux Single',
      status: OTE_STATUS.STOPPED,
      instances: { ready: 1, total: 2 },
      lastOperation: { kind: 'stop', label: 'Стоп' },
      updatedAt: '2024-10-01T08:00:00.000Z',
      caseOneVersion: '2.29',
      history: [{ at: '2024-10-01T08:00:00.000Z', text: 'Остановка окружения (user1)' }],
      lastBuild: { ok: false, id: '118001', label: 'Ошибка деплоя' },
      instancesDetail: [],
    },
  ]
}
