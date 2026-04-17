<template>
  <div class="w-full">
    <label v-if="label" class="mb-1.5 block text-sm font-bold text-slate-800">{{ label }}</label>
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
  modelValue: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
</script>

<script>
export default {
  inheritAttrs: false,
}
</script>
