<template>
  <span
    class="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-violet-200 bg-violet-50 font-extrabold uppercase tracking-wide text-violet-900"
    :class="compact ? 'px-1 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]'"
  >
    <Lock :class="compact ? 'size-2.5' : 'size-3'" class="opacity-85" aria-hidden="true" />
    Личный
  </span>
</template>

<script setup>
import { Lock } from 'lucide-vue-next'

defineProps({
  /** Чуть компактнее для строки выбранного значения в селекте. */
  compact: { type: Boolean, default: false },
})
</script>
