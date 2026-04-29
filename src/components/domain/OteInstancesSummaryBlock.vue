<template>
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
</template>

<script setup>
defineProps({
  /** @type {{ totalCpu: number, totalMemoryGb: number, quotaMaxCpu: number, quotaMaxMemoryGb: number, cpuPercent: number|null, memoryPercent: number|null, availableCpu: number|null, availableMemoryGb: number|null } | null} */
  summary: { type: Object, default: null },
})

function formatMem(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toFixed(2)
}
</script>
