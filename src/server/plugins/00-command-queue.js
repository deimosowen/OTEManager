import { getCommandQueue } from '../utils/command-queue/queue.js'
import { registerDefaultCommands } from '../utils/command-queue/register-default-commands.js'

/**
 * Инициализация очереди команд и регистрация обработчиков по умолчанию.
 */
export default defineNitroPlugin(() => {
  const queue = getCommandQueue({ concurrency: 1 })
  registerDefaultCommands(queue)
})
