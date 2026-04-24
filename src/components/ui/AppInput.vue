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
      :value="modelValue"
      class="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  /** Подсказка при наведении на лейбл (например, имя параметра TeamCity). */
  labelTitle: { type: String, default: '' },
  modelValue: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
</script>

<script>
export default {
  inheritAttrs: false,
}
</script>
