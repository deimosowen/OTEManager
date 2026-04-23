import { COMMAND_TYPES } from './command-types.js'
import { oteInstanceDeleteStub } from './handlers/ote-instance-delete.stub.js'
import { oteInstancePowerStub } from './handlers/ote-instance-power.stub.js'

/**
 * Регистрирует встроенные команды приложения.
 * Дополнительные команды: вызовите `queue.register(...)` из другого модуля при старте.
 * @param {{ register: (type: string, handler: (ctx: object) => Promise<unknown>) => void }} queue
 */
export function registerDefaultCommands(queue) {
  queue.register(COMMAND_TYPES.OTE_INSTANCE_POWER, oteInstancePowerStub)
  queue.register(COMMAND_TYPES.OTE_INSTANCE_DELETE, oteInstanceDeleteStub)
}
