<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
    <div class="overflow-x-auto">
      <table class="min-w-[980px] w-full border-collapse">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50">
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Имя OTE</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Продукт</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Тип</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Статус</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Инстансы</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Последняя операция</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Обновлено</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="px-4 py-10 text-center text-sm font-semibold text-slate-500">Окружения не найдены</td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="cursor-pointer border-b border-slate-200 transition last:border-b-0 hover:bg-brand-light/60"
            @click="go(row.id)"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2 font-bold text-brand">
                <Server class="size-4 shrink-0 text-slate-400" />
                {{ row.name }}
              </div>
            </td>
            <td class="px-4 py-3 text-sm">{{ row.product }}</td>
            <td class="px-4 py-3 text-sm text-slate-500">{{ row.type }}</td>
            <td class="px-4 py-3">
              <StatusBadge :status="row.status" />
            </td>
            <td class="px-4 py-3 font-mono text-sm font-semibold">{{ instancesLabel(row) }}</td>
            <td class="px-4 py-3" @click.stop>
              <div class="flex items-center gap-2">
                <OpIcon :kind="row.lastOperation?.kind" />
                <span class="text-sm font-semibold">{{ row.lastOperation?.label || '—' }}</span>
                <button
                  v-if="row.status === 'deleting'"
                  type="button"
                  class="text-sm font-semibold text-rose-600 hover:underline"
                  @click="$emit('delete', row.id)"
                >
                  Удалить
                </button>
              </div>
            </td>
            <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ formatDateRu(row.updatedAt) }}</td>
            <td class="px-4 py-3" @click.stop>
              <div class="flex items-center gap-2">
                <AppButton
                  v-if="row.status !== 'deleting'"
                  size="sm"
                  :variant="row.status === 'running' ? 'primary' : 'secondary'"
                  class="!px-3.5 !py-1.5"
                  @click="$emit('toggle-power', row.id)"
                >
                  {{ row.status === 'running' ? 'Стоп' : 'Старт' }}
                </AppButton>
                <button
                  type="button"
                  class="flex size-7 items-center justify-center rounded-md border border-sky-200 bg-white text-brand transition hover:border-brand hover:bg-brand-light"
                  aria-label="Открыть"
                  @click="go(row.id)"
                >
                  <ChevronRight class="size-3.5" />
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
import { ChevronRight, Server, Play, Square } from 'lucide-vue-next'
import { h } from 'vue'
import { formatDateRu } from '~/utils/date'

defineProps({
  rows: { type: Array, default: () => [] },
})

defineEmits(['toggle-power', 'delete'])

const router = useRouter()

function instancesLabel(row) {
  const { ready, total } = row.instances || { ready: 0, total: 0 }
  return `${ready}/${total}`
}

function go(id) {
  router.push(`/environments/${id}`)
}

const OpIcon = {
  props: { kind: { type: String, default: 'start' } },
  setup(p) {
    return () =>
      h(
        'div',
        {
          class: [
            'flex size-[26px] items-center justify-center rounded-md',
            p.kind === 'stop' ? 'bg-slate-100 text-slate-500' : 'bg-sky-100 text-brand',
          ],
        },
        [p.kind === 'stop' ? h(Square, { size: 14, strokeWidth: 2.5 }) : h(Play, { size: 14, strokeWidth: 2.5 })],
      )
  },
}
</script>
