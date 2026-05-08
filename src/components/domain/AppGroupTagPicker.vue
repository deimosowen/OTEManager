<template>
  <div ref="root" class="relative">
    <label class="mb-1 block text-sm font-bold text-slate-800">{{ label }}</label>
    <p v-if="hint" class="mb-1.5 text-[11px] font-semibold leading-snug text-slate-500">{{ hint }}</p>
    <p v-if="errorMessage" class="mb-2 text-xs font-semibold text-rose-700">{{ errorMessage }}</p>

    <div
      role="combobox"
      :aria-expanded="dropdownOpen"
      class="flex min-h-[42px] cursor-text flex-wrap gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-inner outline-none transition hover:border-slate-300 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"
      @click="focusInput"
    >
      <span
        v-for="id in modelValueSorted"
        :key="id"
        class="inline-flex max-w-full items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50/90 py-0.5 pl-2 pr-0.5 text-xs font-bold text-emerald-900"
      >
        <span class="max-w-[200px] truncate">{{ nameById.get(id) || `#${id}` }}</span>
        <button
          type="button"
          class="rounded p-0.5 text-emerald-700/80 transition hover:bg-emerald-200/60 hover:text-emerald-950"
          :aria-label="`Убрать группу ${nameById.get(id) || id}`"
          @click.stop="remove(id)"
        >
          <X class="size-3.5 shrink-0" aria-hidden="true" />
        </button>
      </span>
      <input
        ref="inputRef"
        v-model="filterText"
        type="text"
        class="min-w-[10rem] flex-1 border-0 bg-transparent py-0.5 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
        :placeholder="placeholder"
        autocomplete="off"
        @focus="dropdownOpen = true"
        @keydown.escape.prevent="dropdownOpen = false"
        @keydown.backspace="onBackspace"
      />
    </div>

    <ul
      v-if="dropdownOpen && filteredChoices.length"
      class="absolute z-30 mt-1 max-h-44 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg ring-1 ring-slate-900/5"
      role="listbox"
    >
      <li
        v-for="g in filteredChoices"
        :key="g.id"
        role="option"
        class="cursor-pointer px-3 py-2 font-semibold text-slate-800 hover:bg-brand-light/50"
        @mousedown.prevent="pick(g.id)"
      >
        {{ g.name }}
        <span v-if="g.isSystem" class="ml-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
          сист.
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { X } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  /** @type {{ id: number, code?: string, name: string, isSystem?: boolean }[]} */
  groups: { type: Array, default: () => [] },
  /** @type {number[]} */
  modelValue: { type: Array, default: () => [] },
  label: { type: String, default: 'Группы с доступом' },
  hint: { type: String, default: '' },
  placeholder: { type: String, default: 'Начните ввод или кликните — выберите группы…' },
  errorMessage: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const inputRef = ref(null)
const filterText = ref('')
const dropdownOpen = ref(false)

const idSet = computed(() => new Set((props.modelValue || []).map((x) => Math.trunc(Number(x)))))

const nameById = computed(() => {
  const m = new Map()
  for (const g of props.groups || []) {
    m.set(Math.trunc(Number(g.id)), String(g.name || ''))
  }
  return m
})

const modelValueSorted = computed(() => {
  const ids = [...(props.modelValue || [])]
    .map((x) => Math.trunc(Number(x)))
    .filter((n) => Number.isInteger(n) && n > 0)
  const nm = nameById.value
  const uniq = [...new Set(ids)]
  return uniq.sort((a, b) => (nm.get(a) || '').localeCompare(nm.get(b) || '', 'ru'))
})

const filteredChoices = computed(() => {
  const q = filterText.value.trim().toLowerCase()
  const out = []
  for (const g of props.groups || []) {
    const id = Math.trunc(Number(g.id))
    if (!Number.isInteger(id) || id < 1) continue
    if (idSet.value.has(id)) continue
    const name = String(g.name || '')
    const code = String(g.code || '')
    if (!q || name.toLowerCase().includes(q) || code.toLowerCase().includes(q)) {
      out.push(g)
    }
  }
  out.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'))
  return out
})

function focusInput() {
  inputRef.value?.focus()
}

function emitIds(next) {
  emit(
    'update:modelValue',
    [...next].map((x) => Math.trunc(Number(x))).filter((n) => Number.isInteger(n) && n > 0),
  )
}

function remove(id) {
  const n = Math.trunc(Number(id))
  emitIds((props.modelValue || []).filter((x) => Math.trunc(Number(x)) !== n))
}

function pick(id) {
  const n = Math.trunc(Number(id))
  if (!Number.isInteger(n) || n < 1 || idSet.value.has(n)) return
  emitIds([...(props.modelValue || []), n])
  filterText.value = ''
}

function onBackspace() {
  if (filterText.value) return
  const ids = [...modelValueSorted.value]
  const last = ids[ids.length - 1]
  if (last != null) remove(last)
}

/** @param {MouseEvent} e */
function onDocMouseDown(e) {
  const el = root.value
  const t = /** @type {Node | null} */ (e.target)
  if (!el || !t || !el.contains(t)) {
    dropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDown))
</script>
