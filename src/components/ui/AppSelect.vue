<template>
  <div class="w-full">
    <label v-if="label" class="mb-1.5 block text-sm font-bold text-slate-800">{{ label }}</label>
    <div class="relative">
      <select
        :value="modelValue"
        class="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-for="opt in options" :key="String(opt.value)" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <ChevronDown
        class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next'

defineProps({
  label: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  /** @type {{ value: string, label: string }[]} */
  options: { type: Array, default: () => [] },
})
defineEmits(['update:modelValue'])
</script>
