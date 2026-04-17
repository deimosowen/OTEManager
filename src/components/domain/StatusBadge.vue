<template>
  <span :class="wrapClass">
    <span :class="['size-1.5 shrink-0 rounded-full', dotClass]" />
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { OTE_STATUS, OTE_STATUS_LABELS } from '~/constants/ote'

const props = defineProps({
  status: { type: String, required: true },
})

const label = computed(() => OTE_STATUS_LABELS[props.status] || '—')

const wrapClass = computed(() => {
  if (props.status === OTE_STATUS.RUNNING) return badge('emerald')
  if (props.status === OTE_STATUS.STOPPED) return badge('rose')
  if (props.status === OTE_STATUS.DELETING) return badge('amber')
  return 'inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600'
})

const dotClass = computed(() => {
  if (props.status === OTE_STATUS.RUNNING) return 'bg-emerald-500'
  if (props.status === OTE_STATUS.STOPPED) return 'bg-rose-500'
  if (props.status === OTE_STATUS.DELETING) return 'bg-amber-500'
  return 'bg-slate-400'
})

function badge(tone) {
  const map = {
    emerald: 'bg-emerald-100 text-emerald-900',
    rose: 'bg-rose-100 text-rose-900',
    amber: 'bg-amber-100 text-amber-900',
  }
  return `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${map[tone]}`
}
</script>
