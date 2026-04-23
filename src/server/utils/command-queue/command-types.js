/**
 * Идентификаторы команд — строковый контракт для регистрации и dispatch.
 * Новые команды: добавьте константу здесь и зарегистрируйте обработчик в `register-default-commands.js`
 * (или в отдельном плагине / модуле инициализации).
 */
export const COMMAND_TYPES = Object.freeze({
  /** Запуск или остановка всех ВМ OTE. payload: `{ oteId, action: 'start'|'stop', memberIds?: string[] }` */
  OTE_INSTANCE_POWER: 'ote.instance.power',
  /** Удаление всех ВМ OTE. payload: `{ oteId, confirm: true, memberIds?: string[] }` */
  OTE_INSTANCE_DELETE: 'ote.instance.delete',
})
