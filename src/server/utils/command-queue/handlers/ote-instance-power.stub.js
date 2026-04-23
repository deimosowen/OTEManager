/**
 * Заглушка: запуск/остановка ВМ (без вызовов Yandex Cloud).
 * @param {{ type: string, payload?: unknown, meta?: Record<string, unknown> }} ctx
 */
export async function oteInstancePowerStub(ctx) {
  const p = ctx.payload && typeof ctx.payload === 'object' ? ctx.payload : {}
  return {
    stub: true,
    command: ctx.type,
    oteId: p.oteId,
    action: p.action,
    processedAt: new Date().toISOString(),
  }
}
