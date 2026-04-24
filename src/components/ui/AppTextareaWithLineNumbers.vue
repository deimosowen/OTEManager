<template>
  <div
    class="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15"
  >
    <div
      class="pointer-events-none absolute bottom-0 left-0 top-0 z-[1] w-11 overflow-hidden border-r border-slate-200 bg-slate-100"
      aria-hidden="true"
    >
      <div
        class="select-none pt-2.5 text-right font-mono text-xs tabular-nums text-slate-400"
        :style="{ transform: `translateY(${-scrollTop}px)` }"
      >
        <div
          v-for="n in lineCount"
          :key="n"
          class="pr-1.5"
          :style="{ height: `${lh}px`, lineHeight: `${lh}px` }"
        >
          {{ n }}
        </div>
      </div>
    </div>
    <textarea
      ref="taRef"
      :value="modelValue"
      :spellcheck="spellcheck"
      :placeholder="placeholder"
      :class="[
        'block w-full resize-y border-0 bg-transparent py-2.5 pl-12 pr-3 font-mono text-xs leading-relaxed text-slate-900 outline-none focus:ring-0',
        minHeightClass,
      ]"
      @scroll="onScroll"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  spellcheck: { type: Boolean, default: false },
  minHeightClass: { type: String, default: 'min-h-[420px]' },
})

defineEmits(['update:modelValue'])

const taRef = ref(null)
const scrollTop = ref(0)
const lh = ref(20)

const lineCount = computed(() => {
  const s = props.modelValue ?? ''
  const n = s.split('\n').length
  return Math.max(1, n)
})

function onScroll(e) {
  scrollTop.value = e.target.scrollTop
}

function measureLineHeight() {
  nextTick(() => {
    const el = taRef.value
    if (!el) return
    const v = parseFloat(getComputedStyle(el).lineHeight)
    if (Number.isFinite(v) && v > 0) lh.value = v
  })
}

onMounted(measureLineHeight)
watch(() => props.modelValue, measureLineHeight)
</script>
