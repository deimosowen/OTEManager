<template>
  <div class="space-y-4">
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div class="overflow-x-auto">
        <table class="min-w-[1000px] w-full border-collapse font-mono text-[13px]">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th class="px-3 py-2.5">Username</th>
              <th class="px-3 py-2.5">Tag</th>
              <th class="px-3 py-2.5">VM name</th>
              <th class="px-3 py-2.5">IP</th>
              <th class="px-3 py-2.5">Status</th>
              <th class="px-3 py-2.5">CPU</th>
              <th class="px-3 py-2.5">Memory GB</th>
              <th class="px-3 py-2.5">Delete Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!rows.length">
              <td colspan="8" class="px-4 py-10 text-center text-sm font-semibold text-slate-500">Нет ВМ по фильтру</td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.key"
              class="border-b border-slate-100 last:border-b-0"
              :class="rowClass(row)"
              @click="onRowClick(row)"
            >
              <td class="px-3 py-1.5 align-top font-semibold text-slate-800">{{ row.username }}</td>
              <td class="px-3 py-1.5 align-top text-slate-700">{{ row.tag }}</td>
              <td class="px-3 py-1.5 align-top text-slate-900">{{ row.vmName }}</td>
              <td class="px-3 py-1.5 align-top text-slate-600">{{ row.ip }}</td>
              <td class="px-3 py-1.5 align-top">
                <span v-if="row.statusYc" :class="statusClass(row.statusYc)">{{ row.statusYc }}</span>
              </td>
              <td class="px-3 py-1.5 align-top text-slate-700">{{ row.cores != null ? row.cores : '' }}</td>
              <td class="px-3 py-1.5 align-top text-slate-700">{{ memCell(row.memoryGb) }}</td>
              <td class="px-3 py-1.5 align-top text-slate-600">{{ row.deleteDate }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <section
      v-if="summary"
      class="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 font-mono text-[13px] text-slate-800 shadow-inner"
    >
      <h2 class="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-500">Итоги</h2>
      <p class="py-0.5">Всего используется CPU: <span class="font-bold">{{ summary.totalCpu }}</span></p>
      <p class="py-0.5">
        Всего используется Memory:
        <span class="font-bold">{{ formatMem(summary.totalMemoryGb) }}</span>
        GB
      </p>
      <template v-if="summary.quotaMaxCpu > 0 && summary.quotaMaxMemoryGb > 0">
        <h3 class="mb-2 mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">Квоты</h3>
        <p class="py-0.5">Максимум CPU: {{ summary.quotaMaxCpu }}</p>
        <p class="py-0.5">Максимум Memory: {{ formatMem(summary.quotaMaxMemoryGb) }} GB</p>
        <h3 class="mb-2 mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">Использование</h3>
        <p v-if="summary.cpuPercent != null" class="py-0.5">
          CPU: {{ summary.cpuPercent }}% ({{ summary.totalCpu }}/{{ summary.quotaMaxCpu }})
        </p>
        <p v-if="summary.memoryPercent != null" class="py-0.5">
          Memory: {{ summary.memoryPercent }}% ({{ formatMem(summary.totalMemoryGb) }}/{{ formatMem(summary.quotaMaxMemoryGb) }} GB)
        </p>
        <h3 class="mb-2 mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">Доступно</h3>
        <p v-if="summary.availableCpu != null" class="py-0.5">CPU: {{ summary.availableCpu }}</p>
        <p v-if="summary.availableMemoryGb != null" class="py-0.5">Memory: {{ formatMem(summary.availableMemoryGb) }} GB</p>
      </template>
    </section>
  </div>
</template>

<script setup>
const props = defineProps({
  tcTable: { type: Object, default: null },
})

const router = useRouter()

const rows = computed(() => (props.tcTable && Array.isArray(props.tcTable.rows) ? props.tcTable.rows : []))
const summary = computed(() => (props.tcTable && props.tcTable.summary ? props.tcTable.summary : null))

function memCell(v) {
  if (v == null || Number.isNaN(v)) return ''
  return String(v)
}

function formatMem(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toFixed(2)
}

function statusClass(s) {
  const u = String(s).toUpperCase()
  if (u === 'RUNNING') return 'font-bold text-emerald-700'
  if (u === 'STOPPED') return 'font-semibold text-slate-500'
  if (u === 'DELETING') return 'font-bold text-amber-700'
  return 'font-semibold text-slate-700'
}

function rowClass(row) {
  if (row.kind === 'vm') return 'cursor-pointer hover:bg-brand-light/50'
  if (row.kind === 'user') return 'bg-slate-100/90'
  if (row.kind === 'tag') return 'bg-slate-50/80'
  return ''
}

function onRowClick(row) {
  if (row.kind !== 'vm' || !row.instanceId) return
  router.push(`/environments/${row.instanceId}`)
}
</script>
