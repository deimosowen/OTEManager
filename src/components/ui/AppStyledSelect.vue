<template>
  <div ref="rootRef" class="min-w-0">
    <AppTooltip v-if="label && labelTitle" :content="labelTitle">
      <template #default="{ describedBy }">
        <label
          :id="labelId"
          :aria-describedby="describedBy || undefined"
          class="mb-1.5 block cursor-help text-sm font-bold text-slate-800 underline decoration-dotted decoration-slate-400 underline-offset-2 hover:decoration-slate-500"
        >
          {{ label }}
        </label>
      </template>
    </AppTooltip>
    <label v-else-if="label" :id="labelId" class="mb-1.5 block text-sm font-bold text-slate-800">
      {{ label }}
    </label>

    <div class="relative">
      <button
        ref="buttonRef"
        type="button"
        :disabled="!options.length"
        class="flex w-full items-center gap-2 rounded-xl border border-slate-200/95 bg-white px-3.5 py-2.5 pr-10 text-left text-sm text-slate-800 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:shadow-md focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
        :aria-expanded="open ? 'true' : 'false'"
        aria-haspopup="listbox"
        :aria-labelledby="label ? labelId : undefined"
        :aria-controls="open ? listboxId : undefined"
        @click="toggle"
        @keydown.down.prevent="openFromKeyboard"
        @keydown.up.prevent="openFromKeyboard"
      >
        <span class="min-w-0 flex-1">
          <span v-if="selectedOption" class="flex min-w-0 items-center gap-2">
            <span class="truncate font-semibold text-slate-900">{{ selectedOption.label }}</span>
            <PersonalTemplateBadge v-if="selectedOption.isPersonal" compact />
          </span>
          <span v-else class="font-medium text-slate-400">
            {{ options.length ? placeholder : noOptionsMessage }}
          </span>
        </span>
        <ChevronDown
          class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 transition-transform duration-200"
          :class="open ? 'rotate-180' : ''"
          aria-hidden="true"
        />
      </button>

      <Teleport to="body">
        <Transition name="app-styled-select-panel">
          <div
            v-if="open && options.length"
            :id="listboxId"
            ref="panelRef"
            role="listbox"
            :aria-labelledby="label ? labelId : undefined"
            class="fixed z-[280] overflow-auto rounded-xl border border-slate-200/95 bg-white py-1 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.04]"
            :style="panelStyle"
          >
            <button
              v-for="opt in options"
              :key="String(opt.value)"
              type="button"
              role="option"
              :aria-selected="isSelected(opt) ? 'true' : 'false'"
              class="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm transition hover:bg-slate-50"
              :class="
                isSelected(opt)
                  ? 'bg-gradient-to-r from-brand/[0.08] to-sky-50/50 font-bold text-brand-dark'
                  : 'font-semibold text-slate-800'
              "
              @click="choose(opt)"
            >
              <span class="min-w-0 flex-1 truncate">{{ opt.label }}</span>
              <PersonalTemplateBadge v-if="opt.isPersonal" />
            </button>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

import PersonalTemplateBadge from '~/components/domain/PersonalTemplateBadge.vue'

const props = defineProps({
  label: { type: String, default: '' },
  labelTitle: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  /**
   * @type {{ value: string | number, label: string, isPersonal?: boolean }[]}
   */
  options: { type: Array, default: () => [] },
  /** Текст, если значение ещё не выбрано и список не пуст. */
  placeholder: { type: String, default: 'Выберите значение' },
  /** Текст при пустом списке опций. */
  noOptionsMessage: { type: String, default: 'Нет вариантов' },
})

const emit = defineEmits(['update:modelValue'])

const uid = useId()
const labelId = `styled-sel-lbl-${uid}`
const listboxId = `styled-sel-lb-${uid}`

const open = ref(false)
const rootRef = ref(null)
const buttonRef = ref(null)
const panelRef = ref(null)
const panelStyle = ref({
  top: '0px',
  left: '0px',
  width: '240px',
  maxHeight: 'min(320px, 50vh)',
})

function valueKey(v) {
  return String(v ?? '')
}

const selectedOption = computed(
  () => props.options.find((o) => valueKey(o.value) === valueKey(props.modelValue)) ?? null,
)

function isSelected(opt) {
  return valueKey(opt.value) === valueKey(props.modelValue)
}

function updatePanelPosition() {
  const btn = buttonRef.value
  if (!btn) return
  const r = btn.getBoundingClientRect()
  const pad = 8
  const maxH = Math.min(320, Math.max(160, window.innerHeight - r.bottom - pad))
  panelStyle.value = {
    top: `${Math.round(r.bottom + 4)}px`,
    left: `${Math.round(Math.max(pad, Math.min(r.left, window.innerWidth - r.width - pad)))}px`,
    width: `${Math.round(r.width)}px`,
    maxHeight: `${maxH}px`,
  }
}

function toggle() {
  if (!props.options.length) return
  open.value = !open.value
}

function choose(opt) {
  emit('update:modelValue', opt.value)
  open.value = false
}

function openFromKeyboard() {
  if (!props.options.length) return
  open.value = true
}

function onDocPointerDown(e) {
  const t = /** @type {Node} */ (e.target)
  if (rootRef.value?.contains(t) || panelRef.value?.contains(t)) return
  open.value = false
}

function onKeydownEscape(e) {
  if (e.key === 'Escape') open.value = false
}

function onWinChange() {
  if (open.value) updatePanelPosition()
}

watch(open, async (v) => {
  if (v) {
    await nextTick()
    updatePanelPosition()
    window.addEventListener('resize', onWinChange)
    window.addEventListener('scroll', onWinChange, true)
    document.addEventListener('pointerdown', onDocPointerDown, true)
    document.addEventListener('keydown', onKeydownEscape, true)
  } else {
    window.removeEventListener('resize', onWinChange)
    window.removeEventListener('scroll', onWinChange, true)
    document.removeEventListener('pointerdown', onDocPointerDown, true)
    document.removeEventListener('keydown', onKeydownEscape, true)
  }
})

onBeforeUnmount(() => {
  open.value = false
  window.removeEventListener('resize', onWinChange)
  window.removeEventListener('scroll', onWinChange, true)
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onKeydownEscape, true)
})
</script>

<style scoped>
.app-styled-select-panel-enter-active,
.app-styled-select-panel-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}
.app-styled-select-panel-enter-from,
.app-styled-select-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
