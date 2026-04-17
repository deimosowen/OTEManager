<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-[22px] font-extrabold text-slate-900">Окружения OTE</h1>
      <NuxtLink
        to="/create"
        class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow transition hover:-translate-y-px hover:bg-brand-dark hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <Plus class="size-3.5" />
        Создать новую OTE
      </NuxtLink>
    </div>

    <OteFiltersBar
      :model-value="store.filters"
      :product-options="store.productOptions"
      :type-options="store.typeOptions"
      @update:model-value="onFilters"
    />

    <OteEnvironmentsTable
      :rows="store.filteredItems"
      @toggle-power="onToggle"
      @delete="onDelete"
    />
  </div>
</template>

<script setup>
import { Plus } from 'lucide-vue-next'
import { useEnvironmentsStore } from '~/stores/environments'
import { OTE_STATUS } from '~/constants/ote'

const store = useEnvironmentsStore()
const toast = useToast()

function onFilters(v) {
  Object.assign(store.filters, v)
}

function onToggle(id) {
  const row = store.byId(id)
  if (!row || row.status === OTE_STATUS.DELETING) return
  const running = row.status === OTE_STATUS.RUNNING
  store.setRunning(id, !running)
  toast.show(running ? `OTE «${row.name}» остановлена` : `OTE «${row.name}» запущена`, running ? 'warn' : 'success')
}

function onDelete(id) {
  const row = store.byId(id)
  if (!row) return
  if (!confirm(`Удалить OTE «${row.name}»?`)) return
  store.remove(id)
  toast.show(`OTE «${row.name}» удалена`, 'error')
}
</script>
