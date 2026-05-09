<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-modal flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledby || undefined"
      @keyup.escape="onEscape"
    >
      <div
        class="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] transition-opacity"
        aria-hidden="true"
        @click="onBackdropClick"
      />
      <div
        :class="[
          'relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-slate-900/5',
          maxWidthClass,
          panelClass,
        ]"
        @click.stop
      >
        <div :class="[barHeightClass, gradientClass]" aria-hidden="true" />
        <div :class="contentClass">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, watch, onUnmounted } from 'vue'

const BAR_H = /** @type {const} */ ({
  sm: 'h-1 shrink-0',
  md: 'h-1.5 shrink-0',
})

const ACCENT = /** @type {Record<string, string>} */ ({
  rose: 'bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400',
  brand: 'bg-gradient-to-r from-brand via-sky-500 to-sky-400',
  indigo: 'bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500',
  teal: 'bg-gradient-to-r from-teal-500 via-brand to-violet-500',
  emerald: 'bg-gradient-to-r from-emerald-500 via-brand to-violet-500',
})

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** id элемента-заголовка для aria-labelledby */
  labelledby: { type: String, default: '' },
  /** Верхняя цветная полоса модалки */
  accent: { type: String, default: 'brand' },
  /** Высота полосы: sm — центрированные диалоги, md — нижние шиты */
  accentHeight: {
    type: String,
    default: 'sm',
    validator: (v) => v === 'sm' || v === 'md',
  },
  maxWidthClass: { type: String, default: 'max-w-[440px]' },
  panelClass: { type: String, default: '' },
  contentClass: { type: String, default: 'p-6 sm:p-7' },
  backdropDismissible: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const barHeightClass = computed(() => BAR_H[props.accentHeight === 'md' ? 'md' : 'sm'])

const gradientClass = computed(() => ACCENT[props.accent] || ACCENT.brand)

function onBackdropClick() {
  if (!props.backdropDismissible) return
  emit('update:modelValue', false)
}

function onEscape() {
  onBackdropClick()
}

watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('overflow-hidden', Boolean(open))
  },
  { immediate: true },
)

onUnmounted(() => {
  if (typeof document !== 'undefined') document.documentElement.classList.remove('overflow-hidden')
})
</script>
