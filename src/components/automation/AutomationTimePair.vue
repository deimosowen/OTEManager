<template>
  <div class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/90 px-2 py-1.5 shadow-inner ring-1 ring-slate-100">
    <span class="sr-only">Часы и минуты</span>
    <AppSelect
      class="automation-time-select !min-w-0 shrink-0"
      :model-value="hours"
      :options="hourOpts"
      placeholder="ЧЧ"
      panel-max-height-px="220"
      @update:model-value="onHours"
    />
    <span class="pb-0.5 text-lg font-black leading-none text-slate-300">:</span>
    <AppSelect
      class="automation-time-select !min-w-0 shrink-0"
      :model-value="minutes"
      :options="minuteOpts"
      placeholder="ММ"
      panel-max-height-px="220"
      @update:model-value="onMinutes"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppSelect from '~/components/ui/AppSelect.vue'

const props = defineProps({
  /** Формат HH:mm */
  modelValue: { type: String, default: '09:00' },
})

const emit = defineEmits(['update:modelValue'])

const hourOpts = computed(() =>
  Array.from({ length: 24 }, (_, i) => {
    const v = String(i).padStart(2, '0')
    return { value: v, label: v }
  }),
)

const minuteOpts = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    const n = i * 5
    const v = String(n).padStart(2, '0')
    return { value: v, label: v }
  }),
)

const hours = computed(() => {
  const p = String(props.modelValue || '00:00').split(':')
  return p[0] || '00'
})

const minutes = computed(() => {
  const p = String(props.modelValue || '00:00').split(':')
  const m = p[1] || '00'
  const n = Number.parseInt(m, 10)
  const snapped = Number.isNaN(n) ? 0 : Math.round(n / 5) * 5
  const s = String(Math.min(55, snapped)).padStart(2, '0')
  return s
})

function emitPair(h, m) {
  emit('update:modelValue', `${h}:${m}`)
}

function onHours(h) {
  emitPair(String(h || '00').padStart(2, '0'), minutes.value)
}

function onMinutes(m) {
  emitPair(hours.value, String(m || '00').padStart(2, '0'))
}
</script>

<style scoped>
.automation-time-select :deep(label) {
  display: none;
}
.automation-time-select :deep(button) {
  min-width: 4.25rem;
  padding-left: 0.65rem;
  padding-right: 2rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  letter-spacing: 0.02em;
}
</style>
