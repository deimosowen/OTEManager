<template>
  <div class="min-w-0">
    <AppTooltip v-if="label && labelTitle" :content="labelTitle">
      <template #default="{ describedBy }">
        <label
          :aria-describedby="describedBy || undefined"
          class="mb-1.5 block cursor-help text-sm font-bold text-slate-800 underline decoration-dotted decoration-slate-400 underline-offset-2 hover:decoration-slate-500"
        >
          {{ label }}
        </label>
      </template>
    </AppTooltip>
    <label v-else-if="label" class="mb-1.5 block text-sm font-bold text-slate-800">
      {{ label }}
    </label>
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
  /** Подсказка при наведении на лейбл (например, имя параметра TeamCity). */
  labelTitle: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  /** @type {{ value: string, label: string }[]} */
  options: { type: Array, default: () => [] },
})
defineEmits(['update:modelValue'])
</script>
