/**
 * Заглушка: удаление ВМ OTE (без вызовов Yandex Cloud).
 * @param {{ type: string, payload?: unknown, meta?: Record<string, unknown> }} ctx
 */
export async function oteInstanceDeleteStub(ctx) {
  const p = ctx.payload && typeof ctx.payload === 'object' ? ctx.payload : {}
  return {
    stub: true,
    command: ctx.type,
    oteId: p.oteId,
    confirm: p.confirm === true,
    processedAt: new Date().toISOString(),
  }
}
