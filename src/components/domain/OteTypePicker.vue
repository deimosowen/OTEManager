<template>
  <div>
    <div class="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">Выберите тип окружения</div>
    <div class="flex flex-wrap gap-3">
      <button
        v-for="t in types"
        :key="t.id"
        type="button"
        class="w-[120px] rounded-xl border-2 bg-white p-4 text-center transition hover:border-brand hover:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
        :class="modelValue === t.id ? 'border-brand bg-brand-light shadow-[0_0_0_3px_rgba(37,99,235,0.15)]' : 'border-slate-200'"
        @click="$emit('update:modelValue', t.id)"
      >
        <div
          class="mx-auto mb-2 flex size-12 items-center justify-center rounded-[10px]"
          :class="iconWrapClass(t.id)"
        >
          <Monitor class="size-7" :class="iconClass(t.id)" :stroke-width="1.8" />
        </div>
        <div class="text-xs font-bold" :class="modelValue === t.id ? 'text-brand-dark' : 'text-slate-900'">
          {{ t.name }}
        </div>
        <div class="mt-1 text-[11px] text-slate-500">{{ t.subtitle }}</div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { Monitor } from 'lucide-vue-next'
import { OTE_ENV_TYPES } from '~/constants/ote'

defineProps({
  modelValue: { type: String, default: 'astra-linux' },
})

defineEmits(['update:modelValue'])

const types = OTE_ENV_TYPES

function iconWrapClass(id) {
  const map = {
    'astra-linux': 'bg-sky-100',
    'win-single': 'bg-sky-100',
    'win-saas': 'bg-sky-100',
    'linux-single': 'bg-emerald-50',
    'linux-saas': 'bg-orange-50',
  }
  return map[id] || 'bg-slate-100'
}

function iconClass(id) {
  const map = {
    'astra-linux': 'text-brand',
    'win-single': 'text-sky-500',
    'win-saas': 'text-sky-400',
    'linux-single': 'text-emerald-600',
    'linux-saas': 'text-orange-600',
  }
  return map[id] || 'text-slate-600'
}
</script>
