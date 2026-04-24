<template>
  <div
    :class="[
      'flex overflow-auto rounded-xl border border-slate-100 bg-slate-50 font-mono text-xs leading-relaxed',
      maxHeightClass,
    ]"
  >
    <div
      class="sticky left-0 z-[1] shrink-0 select-none border-r border-slate-200 bg-slate-100 py-2.5 pl-2 pr-2.5 text-right tabular-nums text-slate-400"
      aria-hidden="true"
    >
      <div v-for="n in lineNumbers" :key="n">{{ n }}</div>
    </div>
    <pre class="m-0 min-w-0 flex-1 whitespace-pre p-2.5 text-slate-800">{{ text }}</pre>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Текст с переносами строк (\n) — одна строка нумерации на одну логическую строку. */
  text: { type: String, default: '' },
  maxHeightClass: { type: String, default: 'max-h-[420px]' },
})

const lineNumbers = computed(() => {
  const raw = props.text ?? ''
  const n = raw === '' ? 1 : raw.split('\n').length
  return Array.from({ length: n }, (_, i) => i + 1)
})
</script>
