<template>
  <AppModal
    v-model="openProxy"
    labelledby="automation-scenario-meta-title"
    accent="brand"
    max-width-class="max-w-[480px]"
  >
    <div class="px-6 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
      <h2 id="automation-scenario-meta-title" class="text-lg font-extrabold tracking-tight text-slate-900">
        {{ mode === 'create' ? 'Новый сценарий' : 'Параметры сценария' }}
      </h2>
      <p class="mt-1 text-sm font-medium text-slate-500">
        Название, статус публикации и включение сценария (отключённые не запускаются с главной).
      </p>

      <div class="mt-6 space-y-5">
        <AppInput v-model="form.name" label="Название" placeholder="Например: Утренний запуск ВМ" native-type="text" />
        <AppSelect
          v-model="form.status"
          label="Статус"
          :options="statusOptions"
          panel-max-height-px="220"
        />
        <label
          class="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100 transition hover:border-brand/30"
        >
          <input v-model="form.enabled" type="checkbox" class="mt-1 size-4 rounded border-slate-300 text-brand focus:ring-brand" />
          <span class="min-w-0">
            <span class="block text-sm font-bold text-slate-800">Сценарий включён</span>
            <span class="mt-0.5 block text-xs font-medium leading-relaxed text-slate-500">
              Если выключить, ручной запуск и будущие триггеры для этого сценария работать не будут.
            </span>
          </span>
        </label>
      </div>

      <p v-if="hint" class="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 ring-1 ring-rose-100">
        {{ hint }}
      </p>

      <div class="mt-8 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
        <AppButton variant="secondary" size="md" type="button" @click="close">Отмена</AppButton>
        <AppButton size="md" type="button" @click="submit">
          {{ mode === 'create' ? 'Создать и открыть' : 'Сохранить' }}
        </AppButton>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppSelect from '~/components/ui/AppSelect.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** @type {'create' | 'edit'} */
  mode: { type: String, default: 'create' },
  /** Частичное начальное состояние для режима edit */
  initial: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const openProxy = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const statusOptions = [
  { value: 'draft', label: 'Черновик' },
  { value: 'published', label: 'Опубликован' },
]

const form = reactive({
  name: 'Новый сценарий',
  status: /** @type {'draft'|'published'} */ ('draft'),
  enabled: true,
})

function hydrate() {
  if (props.mode === 'edit' && props.initial && typeof props.initial === 'object') {
    form.name = String(props.initial.name || '').trim() || 'Сценарий'
    form.status = props.initial.status === 'published' ? 'published' : 'draft'
    form.enabled = props.initial.enabled !== false
  } else {
    form.name = 'Новый сценарий'
    form.status = 'draft'
    form.enabled = true
  }
}

watch(
  () => [props.modelValue, props.mode, props.initial],
  () => {
    if (props.modelValue) hydrate()
  },
)

const hint = computed(() => {
  if (!props.modelValue) return ''
  if (!String(form.name || '').trim()) return 'Укажите название сценария.'
  return ''
})

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (hint.value) return
  emit('submit', {
    name: String(form.name || '').trim(),
    status: form.status,
    enabled: Boolean(form.enabled),
  })
}

// submitting controlled by parent via optional future prop; keep local false — parent closes modal after fetch
</script>
