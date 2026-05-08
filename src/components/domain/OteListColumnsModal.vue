<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[240] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ote-list-columns-title"
    >
      <div class="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" aria-hidden="true" @click="close" />
      <div
        class="relative max-h-[min(90vh,720px)] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-slate-900/5"
        @click.stop
      >
        <div class="h-1 bg-gradient-to-r from-teal-500 via-brand to-violet-500" aria-hidden="true" />
        <div class="max-h-[min(90vh,720px)] overflow-y-auto p-6 sm:p-7">
          <h2 id="ote-list-columns-title" class="text-lg font-extrabold tracking-tight text-slate-900">Колонки списка OTE</h2>
          <p class="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            Отметьте, что показывать, и перетащите строки за иконку слева, чтобы изменить порядок.
          </p>

          <fieldset class="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 sm:px-4">
            <legend class="sr-only">Отображение сгруппированных значений</legend>
            <p class="text-xs font-extrabold uppercase tracking-wide text-slate-500">Несколько ВМ в одной OTE</p>
            <p class="mt-1 text-xs font-medium leading-relaxed text-slate-600">
              Для полей автор, дата удаления, версии и метки: как показывать несколько значений.
            </p>
            <div class="mt-3 flex flex-col gap-2">
              <label class="flex cursor-pointer items-start gap-2.5 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-100">
                <input v-model="localGroupedLayout" type="radio" :value="GROUP_JOIN" class="mt-1 size-4 accent-brand" />
                <span class="text-sm font-semibold text-slate-800">Одна строка (через « / »)</span>
              </label>
              <label class="flex cursor-pointer items-start gap-2.5 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-100">
                <input v-model="localGroupedLayout" type="radio" :value="GROUP_LINES" class="mt-1 size-4 accent-brand" />
                <span class="text-sm font-semibold text-slate-800">По строкам (каждое значение с новой строки)</span>
              </label>
            </div>
          </fieldset>

          <p v-if="errorText" class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
            {{ errorText }}
          </p>

          <ul class="mt-5 space-y-1.5" role="list">
            <li
              v-for="(item, index) in localItems"
              :key="item.id"
              class="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/90 px-2 py-2 sm:px-3"
              :class="dragIndex === index ? 'ring-2 ring-brand/40' : ''"
              draggable="true"
              @dragstart="onDragStart(index, $event)"
              @dragover.prevent="onDragOver(index, $event)"
              @drop="onDrop(index)"
              @dragend="onDragEnd"
            >
              <span
                class="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-400 active:cursor-grabbing"
                aria-hidden="true"
                title="Перетащить"
              >
                <GripVertical class="size-4" />
              </span>
              <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  v-model="item.visible"
                  type="checkbox"
                  class="size-4 shrink-0 accent-brand"
                  :disabled="item.id === requiredId"
                />
                <span class="min-w-0 flex-1 text-sm font-bold text-slate-900">{{ labelFor(item.id) }}</span>
              </label>
            </li>
          </ul>

          <div class="mt-7 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
            <AppButton type="button" variant="secondary" :disabled="saving" @click="close">Отмена</AppButton>
            <AppButton type="button" variant="primary" :loading="saving" @click="save">Сохранить</AppButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { GripVertical } from 'lucide-vue-next'
import {
  OTE_YC_GROUPED_VALUE_JOIN_SLASH,
  OTE_YC_GROUPED_VALUE_MULTI_LINE,
  OTE_YC_REQUIRED_COLUMN_ID,
  normalizeOteGroupedValueLayout,
} from '@app-constants/ote-list-columns.js'

const GROUP_JOIN = OTE_YC_GROUPED_VALUE_JOIN_SLASH
const GROUP_LINES = OTE_YC_GROUPED_VALUE_MULTI_LINE

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** @type {{ id: string, label: string, category?: string }[]} */
  registry: { type: Array, default: () => [] },
  /** @type {{ id: string, visible: boolean }[]} */
  items: { type: Array, default: () => [] },
  groupedValueLayout: { type: String, default: OTE_YC_GROUPED_VALUE_JOIN_SLASH },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const requiredId = OTE_YC_REQUIRED_COLUMN_ID
/** @type {import('vue').Ref<string>} */
const localGroupedLayout = ref(GROUP_JOIN)
const localItems = ref(/** @type {{ id: string, visible: boolean }[]} */ ([]))
const dragIndex = ref(/** @type {number | null} */ (null))
const saving = ref(false)
const errorText = ref('')

function labelFor(id) {
  const r = props.registry.find((x) => x.id === id)
  return r?.label || id
}

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    errorText.value = ''
    if (open && Array.isArray(props.items)) {
      localItems.value = props.items.map((i) => ({ id: i.id, visible: Boolean(i.visible) }))
      localGroupedLayout.value = normalizeOteGroupedValueLayout(props.groupedValueLayout)
    }
  },
)

/** @param {number} index @param {DragEvent} ev */
function onDragStart(index, ev) {
  dragIndex.value = index
  try {
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', String(index))
  } catch {
    /* ignore */
  }
}

/** @param {number} _index @param {DragEvent} ev */
function onDragOver(_index, ev) {
  try {
    ev.dataTransfer.dropEffect = 'move'
  } catch {
    /* ignore */
  }
}

/** @param {number} toIndex */
function onDrop(toIndex) {
  const from = dragIndex.value
  if (from == null || from === toIndex) return
  const arr = localItems.value.slice()
  const [moved] = arr.splice(from, 1)
  arr.splice(toIndex, 0, moved)
  localItems.value = arr
  dragIndex.value = toIndex
}

function onDragEnd() {
  dragIndex.value = null
}

async function save() {
  errorText.value = ''
  saving.value = true
  try {
    const res = await $fetch('/api/me/ote-list-columns', {
      method: 'PUT',
      body: {
        view: 'env_yc',
        items: localItems.value,
        groupedValueLayout: localGroupedLayout.value,
      },
      credentials: 'include',
    })
    emit('saved', res)
    emit('update:modelValue', false)
  } catch (e) {
    errorText.value = e?.data?.message || e?.message || String(e)
  } finally {
    saving.value = false
  }
}
</script>
