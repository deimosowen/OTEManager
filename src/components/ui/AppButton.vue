<template>
  <component
    :is="tag"
    :type="tag === 'button' ? nativeType : undefined"
    :disabled="disabled || loading"
    :class="classes"
    v-bind="$attrs"
  >
    <span v-if="loading" class="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    <slot />
  </component>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost', 'warn'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  /** button | a | NuxtLink */
  tag: { type: String, default: 'button' },
  nativeType: { type: String, default: 'button' },
})

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-7 py-2.5 text-sm',
  }
  const variants = {
    primary: 'bg-brand text-white shadow hover:bg-brand-dark hover:-translate-y-px hover:shadow-md',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand',
    danger: 'border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    warn: 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-500 hover:text-white',
  }
  return [base, sizes[props.size], variants[props.variant]].join(' ')
})
</script>
