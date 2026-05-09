<template>
  <div class="w-full">
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
    <input
      v-bind="$attrs"
      :type="nativeType"
      :value="displayValue"
      :class="[
        'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
        inputClass,
      ]"
      @input="onInput"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  /** Подсказка при наведении на лейбл (например, имя параметра TeamCity). */
  labelTitle: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  /** Совпадает с нативным type (text, search, number, …). Для number в model уходит число или ''. */
  nativeType: { type: String, default: 'text' },
  /** Доп. классы на поле ввода (напр. text-center text-sm). */
  inputClass: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const displayValue = computed(() => {
  if (props.nativeType === 'number' && (props.modelValue === '' || props.modelValue === null || props.modelValue === undefined))
    return ''
  return props.modelValue
})

/** @param {Event & { target?: HTMLInputElement }} ev */
function onInput(ev) {
  const raw = ev.target?.value
  if (props.nativeType === 'number') {
    if (raw === '' || raw == null) {
      emit('update:modelValue', '')
      return
    }
    const n = Number(raw)
    emit('update:modelValue', Number.isNaN(n) ? '' : n)
    return
  }
  emit('update:modelValue', typeof raw === 'string' ? raw : '')
}
</script>

<script>
export default {
  inheritAttrs: false,
}
</script>
