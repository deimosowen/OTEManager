<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ote-saved-config-delete-title"
    >
      <div
        class="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] transition-opacity"
        aria-hidden="true"
        @click="close"
      />
      <div
        class="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-slate-900/5"
        @click.stop
      >
        <div class="h-1 bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400" aria-hidden="true" />
        <div class="p-6 sm:p-7">
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
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { Trash2 } from 'lucide-vue-next'

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
