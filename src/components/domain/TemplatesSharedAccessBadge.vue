<template>
  <div
    ref="anchorRef"
    class="relative inline-flex w-max max-w-none shrink-0 cursor-default outline-none ring-brand/25 focus-visible:ring-2"
    tabindex="0"
    role="button"
    :aria-expanded="floatingOpen"
    aria-haspopup="true"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focus="onFocus"
    @blur="onBlur"
  >
    <!-- Личный шаблон -->
    <div
      v-if="isPersonalRow"
      class="inline-flex w-max shrink-0 cursor-default items-center gap-1 whitespace-nowrap rounded-md border border-violet-200/95 bg-gradient-to-br from-violet-50/90 to-white px-2.5 py-1 text-left text-xs font-extrabold leading-tight tracking-tight text-violet-950 shadow-sm transition hover:border-violet-300/90"
      :title="personalTitle"
    >
      <Lock class="size-3.5 shrink-0 text-violet-600/90" aria-hidden="true" />
      <span>Личный</span>
      <CircleHelp class="size-3.5 shrink-0 text-violet-600/75" aria-hidden="true" />
      <span class="sr-only">{{ personalHint }}</span>
    </div>

    <!-- Общий шаблон -->
    <div
      v-else
      class="inline-flex w-max shrink-0 cursor-default items-center gap-1 whitespace-nowrap rounded-md border border-slate-200/90 bg-gradient-to-br from-white to-sky-50/40 px-2.5 py-1 text-left text-xs leading-tight shadow-sm transition hover:border-brand/35"
      :title="badgeTitle"
    >
      <Users class="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span class="shrink-0 font-extrabold tracking-tight text-slate-800">Общий</span>
      <span class="shrink-0 font-bold tabular-nums tracking-tight text-slate-700">{{ groupCountSegment }}</span>
      <CircleHelp class="size-3.5 shrink-0 text-sky-600/80" aria-hidden="true" />
      <span class="sr-only">{{ hintShort }}</span>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-show="floatingOpen && isPersonalRow"
      :style="panelStyleInline"
      class="fixed z-elevated-popover max-w-[320px] rounded-xl border border-slate-200/95 bg-white p-3 shadow-card-md ring-1 ring-slate-900/8"
      role="tooltip"
      @mouseenter="onPanelEnter"
      @mouseleave="onPanelLeave"
    >
      <p class="text-[13px] font-semibold leading-snug text-slate-800">{{ personalPanelText }}</p>
    </div>
    <div
      v-show="floatingOpen && !isPersonalRow"
      :style="panelStyleInline"
      class="fixed z-elevated-popover max-h-[min(280px,calc(100vh-24px))] overflow-y-auto rounded-xl border border-slate-200/95 bg-white p-2.5 shadow-card-md ring-1 ring-slate-900/8"
      role="tooltip"
      @mouseenter="onPanelEnter"
      @mouseleave="onPanelLeave"
    >
      <ul v-if="groupNamesFiltered.length" class="list-none space-y-0.5 text-[13px] font-semibold text-slate-800">
        <li v-for="(name, idx) in groupNamesFiltered" :key="`${name}-${idx}`" class="flex gap-2 leading-snug">
          <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand/70" aria-hidden="true" />
          <span class="break-words">{{ name }}</span>
        </li>
      </ul>
      <p v-else class="text-[13px] font-semibold text-slate-600">Не заданы</p>
    </div>
  </Teleport>
</template>

<script setup>
import { CircleHelp, Lock, Users } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  /** строка таблицы с полем groupNames */
  row: {
    type: Object,
    default: () => ({}),
  },
})

const anchorRef = ref(/** @type {HTMLElement | null} */ (null))

const isPersonalRow = computed(() => {
  const p = props.row?.isPersonal
  return p === true || p === 1
})

const personalTitle = 'Личный шаблон: виден и редактируется только вами'
const personalHint = 'Подсказка по личному шаблону'
const personalPanelText =
  'Личный шаблон не привязан к группам каталога: в списке «Шаблоны» его видите только вы, остальные пользователи не видят эту запись.'

const SHOW_DELAY_MS = 100
const HIDE_DELAY_MS = 160

/** @type {ReturnType<typeof setTimeout> | null} */
let showT = null
/** @type {ReturnType<typeof setTimeout> | null} */
let hideT = null

const hoveringAnchor = ref(false)
const hoveringPanel = ref(false)
const focusedAnchor = ref(false)
const floatingOpen = ref(false)

const panelLeft = ref(0)
const panelTop = ref(0)
const panelWidth = ref(280)

/** Связки из API: иногда приходят имена групп без id — берём максимум по id и по списку имён */
const linkedGroupCount = computed(() => {
  const rawIds = props.row?.groupIds
  let fromIds = 0
  if (Array.isArray(rawIds)) {
    fromIds = [...new Set(rawIds.map((x) => Math.trunc(Number(x))).filter((n) => Number.isInteger(n) && n > 0))].length
  }
  const rawNames = props.row?.groupNames
  let fromNames = 0
  if (Array.isArray(rawNames) && rawNames.length) {
    fromNames = [...new Set(rawNames.map((x) => String(x || '').trim()).filter(Boolean))].length
  }
  return Math.max(fromIds, fromNames)
})

/** Отображение числа групп без «тонких» символов, которые визуально теряются при обрезке */
const groupCountSegment = computed(() => {
  const n = linkedGroupCount.value
  return n > 0 ? `· ${n}` : `· 0`
})

const groupNamesFiltered = computed(() => {
  const raw = props.row?.groupNames
  if (Array.isArray(raw) && raw.length) {
    return [...new Set(raw.map((x) => String(x || '').trim()).filter(Boolean))]
  }
  const pv = String(props.row?.groupsPreview || '').trim()
  if (!pv) return []
  /** Краткая сводка без массива имён — одна строка в списке */
  return [pv]
})

/** Полная формулировка при наведении на бейдж (браузерный title) */
const badgeTitle = computed(() => {
  const n = linkedGroupCount.value
  if (!n) return 'Общий шаблон: группы каталога не заданы'
  return `Общий шаблон: ${nominativeGroups(n)}`
})

const hintShort = computed(() =>
  linkedGroupCount.value ? 'Список групп каталога' : 'Группы не заданы',
)

const panelStyleInline = computed(() => {
  if (!floatingOpen.value) return undefined
  return {
    left: `${Math.round(panelLeft.value)}px`,
    top: `${Math.round(panelTop.value)}px`,
    width: `${Math.round(panelWidth.value)}px`,
  }
})

/** Именительный: «3 группы» */
/** @param {number} n */
function nominativeGroups(n) {
  const nn = Math.abs(n) % 100
  const d = nn % 10
  let word = 'групп'
  if (nn > 10 && nn < 20) word = 'групп'
  else if (d === 1) word = 'группа'
  else if (d >= 2 && d <= 4) word = 'группы'
  else word = 'групп'
  return `${n} ${word}`
}


function clearTimers() {
  if (showT) {
    clearTimeout(showT)
    showT = null
  }
  if (hideT) {
    clearTimeout(hideT)
    hideT = null
  }
}

function updatePosition() {
  const el = anchorRef.value
  if (!el || typeof window === 'undefined') return

  const r = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const gap = 8
  const m = 10

  const w = Math.min(328, vw - m * 2)
  panelWidth.value = w
  let left = r.left + r.width / 2 - w / 2
  left = Math.max(m, Math.min(left, vw - w - m))
  panelLeft.value = left

  const estH = 52 + Math.max(groupNamesFiltered.value.length, 1) * 22
  let top = r.bottom + gap

  if (top + Math.min(estH, 260) > vh - m) {
    top = Math.max(m, r.top - Math.min(estH, 260) - gap)
  }
  panelTop.value = top
}

async function reveal() {
  floatingOpen.value = true
  await nextTick()
  updatePosition()
}

async function conceal() {
  floatingOpen.value = false
}

function sync() {
  const wantOpen = hoveringAnchor.value || hoveringPanel.value || focusedAnchor.value
  if (wantOpen) {
    clearTimers()
    showT = setTimeout(() => {
      showT = null
      void reveal()
    }, SHOW_DELAY_MS)
    return
  }
  clearTimers()
  hideT = setTimeout(() => {
    hideT = null
    void conceal()
  }, HIDE_DELAY_MS)
}

function onEnter() {
  hoveringAnchor.value = true
  sync()
}

function onLeave() {
  hoveringAnchor.value = false
  sync()
}

function onPanelEnter() {
  hoveringPanel.value = true
  if (hideT) clearTimeout(hideT)
  hideT = null
}

function onPanelLeave() {
  hoveringPanel.value = false
  sync()
}

function onFocus() {
  focusedAnchor.value = true
  sync()
}

function onBlur() {
  focusedAnchor.value = false
  sync()
}

function onViewportChange() {
  if (floatingOpen.value) updatePosition()
}

onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})

onBeforeUnmount(() => {
  clearTimers()
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})
</script>
