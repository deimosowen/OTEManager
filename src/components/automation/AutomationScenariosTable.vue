<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
    <div class="overflow-x-auto">
      <table class="min-w-[720px] w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            <th class="px-3 py-3 sm:px-4">Название</th>
            <th class="hidden px-3 py-3 sm:table-cell">Статус</th>
            <th class="px-3 py-3">Вкл</th>
            <th class="hidden px-3 py-3 md:table-cell">Обновлено</th>
            <th class="px-3 py-3 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!scenarios.length">
            <td colspan="5" class="px-4 py-10 text-center font-semibold text-slate-500">
              Нет сценариев. Создайте первый сценарий кнопкой выше.
            </td>
          </tr>
          <tr v-for="s in scenarios" :key="s.id" class="border-b border-slate-100 last:border-b-0">
            <td class="max-w-0 px-3 py-2.5 align-top sm:px-4">
              <button
                type="button"
                class="block max-w-full truncate text-left font-bold text-brand hover:underline"
                @click="$emit('open', s.id)"
              >
                {{ s.name }}
              </button>
            </td>
            <td class="hidden px-3 py-2.5 align-middle sm:table-cell">
              <span
                class="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ring-1 ring-black/[0.06]"
                :class="statusPillClass(s.status)"
              >
                {{ statusLabel(s.status) }}
              </span>
            </td>
            <td class="px-3 py-2.5 align-middle">
              <span
                class="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ring-1 ring-black/[0.06]"
                :class="s.enabled !== false ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-500'"
              >
                {{ s.enabled !== false ? 'Да' : 'Нет' }}
              </span>
            </td>
            <td class="hidden whitespace-nowrap px-3 py-2.5 align-middle text-xs font-semibold tabular-nums text-slate-700 md:table-cell">
              {{ formatUpdated(s.updatedAt) }}
            </td>
            <td class="px-3 py-2.5 text-right align-middle">
              <div class="inline-flex flex-wrap items-center justify-end gap-1">
                <button
                  type="button"
                  class="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand/35 hover:text-brand"
                  title="Параметры"
                  aria-label="Параметры сценария"
                  @click.stop="$emit('edit-meta', s)"
                >
                  <Pencil class="size-4" stroke-width="2" />
                </button>
                <button
                  type="button"
                  class="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-teal-300 hover:text-teal-700"
                  :title="s.enabled !== false ? 'Отключить сценарий' : 'Включить сценарий'"
                  :aria-label="s.enabled !== false ? 'Отключить' : 'Включить'"
                  @click.stop="$emit('toggle-enabled', s)"
                >
                  <Power v-if="s.enabled !== false" class="size-4 text-teal-600" stroke-width="2" />
                  <PowerOff v-else class="size-4 text-slate-400" stroke-width="2" />
                </button>
                <button
                  type="button"
                  class="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  title="Удалить"
                  aria-label="Удалить сценарий"
                  @click.stop="$emit('delete', s)"
                >
                  <Trash2 class="size-4" stroke-width="2" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { Pencil, Power, PowerOff, Trash2 } from 'lucide-vue-next'

defineProps({
  scenarios: { type: Array, default: () => [] },
})

defineEmits(['open', 'edit-meta', 'toggle-enabled', 'delete'])

function statusLabel(status) {
  if (status === 'published') return 'Опубликован'
  return 'Черновик'
}

function statusPillClass(status) {
  if (status === 'published') return 'bg-emerald-50 text-emerald-900'
  return 'bg-slate-100 text-slate-700'
}

function formatUpdated(iso) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '—'
  }
}
</script>
