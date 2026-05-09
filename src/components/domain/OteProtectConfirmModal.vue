<template>
  <AppModal
    :model-value="modelValue"
    :labelledby="titleId"
    accent="indigo"
    max-width-class="max-w-[440px]"
    :backdrop-dismissible="!confirmLoading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex gap-4">
      <div
        class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600 shadow-inner ring-1 ring-indigo-500/10"
      >
        <component :is="icon" class="size-6" stroke-width="2" aria-hidden="true" />
      </div>
      <div class="min-w-0 flex-1 pt-0.5">
        <h2 :id="titleId" class="text-lg font-extrabold tracking-tight text-slate-900">{{ titleText }}</h2>
        <p class="mt-2 text-sm font-medium leading-relaxed text-slate-600">{{ hintText }}</p>
        <p
          v-if="oteLabel"
          class="mt-4 truncate rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center font-mono text-sm font-semibold text-slate-800"
          :title="oteLabel"
        >
          {{ oteLabel }}
        </p>
      </div>
    </div>
    <div class="mt-7 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
      <AppButton variant="secondary" :disabled="confirmLoading" @click="close">Отмена</AppButton>
      <AppButton :variant="confirmVariant" :loading="confirmLoading" @click="emit('confirm')">
        {{ confirmLabel }}
      </AppButton>
    </div>
  </AppModal>
</template>

<script setup>
import { computed } from 'vue'
import { Shield, ShieldOff } from 'lucide-vue-next'
import AppModal from '~/components/ui/AppModal.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** `protect` — включить защиту; `unprotect` — снять. */
  mode: { type: String, default: 'protect', validator: (v) => v === 'protect' || v === 'unprotect' },
  oteLabel: { type: String, default: '' },
  confirmLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const titleId = 'ote-protect-confirm-title'

const titleText = computed(() =>
  props.mode === 'unprotect' ? 'Снять защиту с OTE?' : 'Защитить эту OTE?',
)

const hintText = computed(() =>
  props.mode === 'unprotect'
    ? 'В TeamCity будет выставлена дата автоудаления через 7 календарных дней от сегодня (UTC). Удаление снова станет доступно.'
    : 'В TeamCity будет выставлена дата автоудаления 31.12.2099. Пока действует защита, удалить OTE через менеджер будет нельзя — только после снятия флага.',
)

const confirmLabel = computed(() => (props.mode === 'unprotect' ? 'Снять защиту' : 'Защитить'))

const confirmVariant = computed(() => (props.mode === 'unprotect' ? 'warn' : 'primary'))

const icon = computed(() => (props.mode === 'unprotect' ? ShieldOff : Shield))

function close() {
  if (props.confirmLoading) return
  emit('update:modelValue', false)
}
</script>
