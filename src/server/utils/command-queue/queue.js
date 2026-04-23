import PQueue from 'p-queue'

/**
 * @typedef {object} CommandContext
 * @property {string} type — значение из `COMMAND_TYPES`
 * @property {unknown} payload — данные команды (контракт задаёт обработчик)
 * @property {Record<string, unknown>} [meta] — контекст запроса (пользователь, trace и т.д.)
 * @property {number} enqueuedAt — `Date.now()` на момент постановки в очередь
 */

/**
 * Обработчик команды: выполняется внутри очереди (последовательно при concurrency=1).
 * @callback CommandHandler
 * @param {CommandContext} ctx
 * @returns {Promise<unknown>}
 */

/**
 * Универсальная in-process очередь на базе `p-queue`: без внешнего брокера,
 * удобно расширять новыми типами через `register`.
 */
export function createCommandQueue(options = {}) {
  const { concurrency = 1, ...rest } = options
  const pq = new PQueue({ concurrency, ...rest })

  /** @type {Map<string, CommandHandler>} */
  const handlers = new Map()

  return {
    /**
     * Зарегистрировать или заменить обработчик типа (удобно при HMR).
     * @param {string} type
     * @param {CommandHandler} handler
     */
    register(type, handler) {
      if (typeof type !== 'string' || !type.trim()) {
        throw new Error('command-queue: type must be a non-empty string')
      }
      if (typeof handler !== 'function') {
        throw new Error(`command-queue: handler for "${type}" must be a function`)
      }
      handlers.set(type, handler)
    },

    /**
     * Поставить команду в очередь и дождаться её выполнения.
     * @param {string} type
     * @param {unknown} payload
     * @param {Record<string, unknown>} [meta]
     */
    async dispatch(type, payload, meta = {}) {
      const handler = handlers.get(type)
      if (!handler) {
        throw new Error(`command-queue: unknown command type "${type}"`)
      }
      const ctx = {
        type,
        payload,
        meta,
        enqueuedAt: Date.now(),
      }
      return pq.add(() => handler(ctx))
    },

    /** Количество задач, ожидающих старта (включая текущую при ожидании). */
    get waitingSize() {
      return pq.size + pq.pending
    },

    /** Активно выполняется задач (0 или 1 при concurrency=1). */
    get activeCount() {
      return pq.pending
    },
  }
}

let singleton = null

/**
 * Один экземпляр очереди на процесс Nitro (достаточно для сериализации команд от разных клиентов).
 * @param {{ concurrency?: number }} [options] — учитываются только при первом вызове
 */
export function getCommandQueue(options) {
  if (!singleton) {
    singleton = createCommandQueue(options || { concurrency: 1 })
  }
  return singleton
}
