<template>
  <AppStyledSelect
    :model-value="modelValue"
    :label="label"
    :label-title="labelTitle"
    :options="options"
    :placeholder="placeholder"
    :no-options-message="noOptionsMessage"
    :panel-min-width-px="panelMinWidthPx"
    :panel-max-height-px="panelMaxHeightPx"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup>
/**
 * Селект каталога окружений и форм: оболочка над AppStyledSelect для единого «кастомного» списка по всему приложению.
 * Раньше здесь был нативный HTML select; теперь везде один кастомный список как в AppStyledSelect.
 */
import AppStyledSelect from '~/components/ui/AppStyledSelect.vue'

defineProps({
  label: { type: String, default: '' },
  /** Подсказка при наведении на лейбл */
  labelTitle: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  /** @type {{ value: string | number, label: string, isPersonal?: boolean }[]} */
  options: { type: Array, default: () => [] },
  /** Если текущее значение не совпало ни с одной опцией (редко) */
  placeholder: { type: String, default: 'Выберите значение' },
  noOptionsMessage: { type: String, default: 'Нет вариантов' },
  /** @see AppStyledSelect */
  panelMinWidthPx: { type: Number, default: undefined },
  /** @see AppStyledSelect */
  panelMaxHeightPx: { type: Number, default: undefined },
})
defineEmits(['update:modelValue'])
</script>
