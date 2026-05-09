<template>
  <AppModal
    :model-value="modelValue"
    labelledby="ote-saved-config-delete-title"
    accent="rose"
    max-width-class="max-w-[420px]"
    :backdrop-dismissible="!confirmLoading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex gap-4">
      <div
        class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 shadow-inner"
      >
        <Trash2 class="size-6" stroke-width="2" aria-hidden="true" />
      </div>
      <div class="min-w-0 flex-1 pt-0.5">
        <h2 id="ote-saved-config-delete-title" class="text-lg font-extrabold tracking-tight text-slate-900">
          Удалить сохранённую конфигурацию?
        </h2>
        <p class="mt-2 text-sm font-medium leading-relaxed text-slate-600">
          Её можно будет создать заново из текущей формы. Системные пресеты TeamCity не затрагиваются.
        </p>
        <p
          v-if="configName"
          class="mt-4 truncate rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center text-sm font-extrabold text-slate-800"
          :title="configName"
        >
          {{ configName }}
        </p>
      </div>
    </div>
    <div class="mt-7 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
      <AppButton variant="secondary" :disabled="confirmLoading" @click="close">Отмена</AppButton>
      <AppButton variant="danger" :loading="confirmLoading" @click="emit('confirm')">Удалить</AppButton>
    </div>
  </AppModal>
</template>

<script setup>
import { Trash2 } from 'lucide-vue-next'
import AppModal from '~/components/ui/AppModal.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  configName: { type: String, default: '' },
  confirmLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

function close() {
  if (props.confirmLoading) return
  emit('update:modelValue', false)
}
</script>
