import { getDb } from '../db/client.js'
import { runAutomationScheduleTickOnce } from '../utils/automation-schedule-tick-once.js'

/**
 * Фоновый опрос включённых сценариев с триггером «Запуск по расписанию».
 * Граф и расписание уже в БД — после перезапуска процесс снова опрашивает их, повторное сохранение не требуется.
 *
 * Важно: не использовать nitroApp.hooks.hook('ready') — в Nitro 3 этот хук в рантайме часто не вызывается,
 * из‑за чего таймер никогда не стартовал. Старт после загрузки плагина через setImmediate.
 */
export default defineNitroPlugin(() => {
  const intervalMs = Math.max(
    5000,
    Math.min(120_000, Number(process.env.AUTOMATION_SCHEDULE_TICK_MS || 10_000) || 10_000),
  )

  let busy = false

  async function tickSafe() {
    if (busy) return
    busy = true
    try {
      const db = getDb()
      const config = useRuntimeConfig()
      await runAutomationScheduleTickOnce({ db, config })
    } catch (e) {
      console.error('[automation-schedule] tick', e)
    } finally {
      busy = false
    }
  }

  function startScheduler() {
    if (process.env.AUTOMATION_SCHEDULE_DEBUG === '1') {
      console.info('[automation-schedule] запуск опроса каждые', intervalMs, 'мс')
    }
    tickSafe().catch((e) => console.error('[automation-schedule] initial tick', e))
    setInterval(() => {
      tickSafe().catch((e) => console.error('[automation-schedule] interval tick', e))
    }, intervalMs)
  }

  if (typeof setImmediate === 'function') {
    setImmediate(startScheduler)
  } else {
    setTimeout(startScheduler, 0)
  }
})
