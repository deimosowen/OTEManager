<template>
  <span
    class="inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border border-sky-200/90 bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-950 shadow-sm"
    :class="compact ? 'pl-1.5 pr-1.5' : 'pl-2 pr-2.5'"
    :title="hint"
    role="img"
    :aria-label="hint"
  >
    <Shield class="size-3.5 shrink-0 text-sky-600" stroke-width="2" aria-hidden="true" />
    <span v-if="!compact">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { Shield } from 'lucide-vue-next'

const props = defineProps({
  /** Только иконка — для узких строк (главная и т.п.), смысл в подсказке и aria. */
  compact: { type: Boolean, default: false },
})

const label = 'Protected'

const hint = computed(() =>
  props.compact
    ? 'Protected: удаление через менеджер недоступно; дату автоудаления задаёт TeamCity.'
    : 'Protected: удаление этой OTE через менеджер недоступно, пока активна защита. Дату автоудаления задаёт сборка TeamCity. Снимите через «Снять защиту» на карточке.',
)
</script>
