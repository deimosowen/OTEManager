<template>
  <div class="relative isolate min-w-0">
    <label v-if="label" :id="labelId" class="mb-1.5 block text-sm font-bold text-slate-800">{{ label }}</label>
    <button
      ref="triggerRef"
      type="button"
      class="trigger-btn flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-800 shadow-inner outline-none transition hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-brand/15"
      :class="{ 'ring-2 ring-brand/25': open }"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-labelledby="label ? labelId : undefined"
      :aria-controls="open ? listId : undefined"
      @click="toggle"
    >
      <span class="min-w-0 truncate font-mono text-[13px]">{{ displayValue }}</span>
      <ChevronDown class="size-4 shrink-0 text-slate-400 transition" :class="{ 'rotate-180': open }" aria-hidden="true" />
    </button>
    <!-- hint снаружи Teleport — не перекрывается выпадающим списком -->
    <p v-if="hint" class="mt-2 text-xs font-medium leading-snug text-slate-500">{{ hint }}</p>

    <Teleport to="body">
      <div
        v-if="open"
        :id="listId"
        ref="floatingRef"
        class="fixed rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 outline-none"
        :style="floatingStyle"
        role="listbox"
        tabindex="-1"
        :aria-activedescendant="highlighted ? optionDomId(highlighted) : undefined"
        @keydown.enter.prevent="selectHighlighted"
        @keydown.escape.prevent="close"
        @keydown.down.prevent="moveHighlight(1)"
        @keydown.up.prevent="moveHighlight(-1)"
      >
        <input
          ref="filterInputRef"
          v-model.trim="filterQuery"
          type="search"
          autocomplete="off"
          class="w-full rounded-t-xl border-b border-slate-100 px-3 py-2 font-mono text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:bg-slate-50/80"
          placeholder="Поиск по названию зоны…"
          aria-autocomplete="list"
          @mousedown.stop.prevent
          @keydown.enter.prevent="selectHighlighted"
          @keydown.down.prevent="moveHighlight(1)"
          @keydown.up.prevent="moveHighlight(-1)"
        />
        <ul class="max-h-52 overflow-y-auto py-1" role="presentation">
          <li
            v-for="z in filteredZones"
            :id="optionDomId(z)"
            :key="z"
            role="option"
            :aria-selected="z === modelValue"
            class="cursor-pointer truncate px-3 py-2 font-mono text-xs text-slate-800"
            :class="highlighted === z ? 'bg-brand-light/90 font-bold text-brand' : 'hover:bg-slate-50'"
            @mousedown.stop.prevent="choose(z)"
          >
            <span class="flex items-center gap-2">
              <Check v-if="z === modelValue" class="size-3.5 shrink-0 text-brand" aria-hidden="true" />
              <span v-else class="size-3.5 shrink-0" aria-hidden="true" />
              {{ z }}
            </span>
          </li>
          <li v-if="filteredZones.length === 0" class="px-3 py-8 text-center text-sm font-semibold text-slate-500">
            Зоны не найдены
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { Check, ChevronDown } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { DEFAULT_USER_TIMEZONE } from '~/constants/user-timezone'

const props = defineProps({
  /** IANA идентификатор зоны */
  modelValue: { type: String, default: DEFAULT_USER_TIMEZONE },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const filterQuery = ref('')
const triggerRef = ref(null)
const floatingRef = ref(null)
const filterInputRef = ref(null)
const highlighted = ref('')
const floatingPos = ref({ top: 8, left: 8, width: 288 })

const labelId = `tz-label-${Math.random().toString(36).slice(2, 9)}`
const listId = `tz-list-${Math.random().toString(36).slice(2, 9)}`

const floatingStyle = computed(() => ({
  top: `${floatingPos.value.top}px`,
  left: `${floatingPos.value.left}px`,
  width: `${floatingPos.value.width}px`,
  zIndex: 9999,
}))

const displayValue = computed(() => (props.modelValue && props.modelValue.trim() ? props.modelValue.trim() : DEFAULT_USER_TIMEZONE))

function slug(z) {
  return String(z).replace(/[^\w]/g, '_')
}

function optionDomId(z) {
  return `${listId}-opt-${slug(z)}`
}

function measureAndPlace() {
  const btn = triggerRef.value
  if (!btn || typeof window === 'undefined') return
  const r = btn.getBoundingClientRect()
  const margin = 4
  const minW = 288
  const w = Math.max(r.width, minW)
  let left = r.left
  if (left + w > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - w - margin)
  let top = r.bottom + margin
  /** ~ панели: поиск ~40px + до 208px список */
  const panelGuess = Math.min(window.innerHeight * 0.5, 22 * 13)
  if (top + panelGuess > window.innerHeight - margin) {
    /** выше триггера */
    top = Math.max(margin, r.top - panelGuess - margin)
  }
  floatingPos.value = { top, left, width: w }
}

function clampFloatingToViewport() {
  const panel = floatingRef.value
  if (!panel || typeof window === 'undefined') return
  const margin = 8
  const br = panel.getBoundingClientRect()
  let { top, left } = floatingPos.value
  if (br.bottom > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - br.height - margin)
  if (br.top < margin) top = margin
  if (br.right > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - br.width - margin)
  if (br.left < margin) left = margin
  floatingPos.value = { ...floatingPos.value, top, left }
}

/** @returns {string[]} */
function buildZoneList() {
  if (!import.meta.client) return [DEFAULT_USER_TIMEZONE]
  try {
    const raw = Intl.supportedValuesOf('timeZone')
    const rest = [...raw].filter((z) => z !== 'UTC').sort((a, b) => a.localeCompare(b, 'en'))
    return ['UTC', ...rest]
  } catch {
    return [DEFAULT_USER_TIMEZONE]
  }
}

const allZones = computed(() => buildZoneList())

const filteredZones = computed(() => {
  const n = filterQuery.value.toLowerCase()
  const list = allZones.value
  if (!n) return list
  return list.filter((z) => z.toLowerCase().includes(n))
})

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
  filterQuery.value = ''
}

function choose(z) {
  emit('update:modelValue', z)
  close()
}

function selectHighlighted() {
  if (filteredZones.value.includes(highlighted.value)) choose(highlighted.value)
}

function moveHighlight(delta) {
  const list = filteredZones.value
  if (!list.length) return
  const cur = highlighted.value
  let idx = cur ? list.indexOf(cur) : -1
  if (idx < 0) idx = delta > 0 ? -1 : 0
  else idx = (idx + delta + list.length) % list.length
  highlighted.value = list[idx]
}

function onViewportChange() {
  if (open.value) measureAndPlace()
}

function onDocMouseDown(ev) {
  if (!open.value) return
  const btn = triggerRef.value
  const panel = floatingRef.value
  const t = ev.target
  if (!(t instanceof Node)) return
  if (btn?.contains(t)) return
  if (panel?.contains(t)) return
  close()
}

watch(open, (v) => {
  if (!v) {
    highlighted.value = ''
    filterQuery.value = ''
    window.removeEventListener('scroll', onViewportChange, true)
    window.removeEventListener('resize', onViewportChange)
    return
  }
  measureAndPlace()
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)

  const cur = props.modelValue?.trim() || ''
  highlighted.value =
    filteredZones.value.find((z) => z === cur) || filteredZones.value[0] || cur || DEFAULT_USER_TIMEZONE
  nextTick(() => {
    measureAndPlace()
    nextTick(() => {
      clampFloatingToViewport()
      filterInputRef.value?.focus?.()
      filterInputRef.value?.select?.()
    })
  })
})

watch(filteredZones, (list) => {
  if (!open.value || !highlighted.value || list.includes(highlighted.value)) return
  highlighted.value = list[0] || ''
})

watch(filterQuery, () => {
  const list = filteredZones.value
  if (list.includes(highlighted.value)) return
  highlighted.value = list[0] || ''
})

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown, true)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onDocMouseDown, true)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})
</script>
