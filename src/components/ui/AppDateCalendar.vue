<template>
  <div
    class="overflow-hidden rounded-xl border border-slate-200/95 bg-gradient-to-b from-white via-white to-slate-50/95 p-3 shadow-sm ring-1 ring-slate-900/[0.04]"
    role="grid"
    :aria-label="monthTitle"
  >
    <div class="mb-3 flex items-center justify-between gap-2">
      <button
        type="button"
        class="flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 disabled:pointer-events-none disabled:opacity-25"
        aria-label="Предыдущий месяц"
        :disabled="!canPrevMonth"
        @click="goPrevMonth"
      >
        <ChevronLeft class="size-5" aria-hidden="true" />
      </button>
      <div class="min-w-0 text-center text-sm font-extrabold tracking-tight text-slate-900">
        {{ monthTitle }}
      </div>
      <button
        type="button"
        class="flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 disabled:pointer-events-none disabled:opacity-25"
        aria-label="Следующий месяц"
        :disabled="!canNextMonth"
        @click="goNextMonth"
      >
        <ChevronRight class="size-5" aria-hidden="true" />
      </button>
    </div>

    <div class="grid grid-cols-7 gap-0.5 border-b border-slate-100 pb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
      <div v-for="w in weekLabels" :key="w" class="text-center">{{ w }}</div>
    </div>

    <div class="mt-2 grid grid-cols-7 gap-1">
      <button
        v-for="cell in cells"
        :key="cell.key"
        type="button"
        role="gridcell"
        :disabled="cell.disabled"
        :aria-selected="cell.selected"
        :aria-current="cell.isToday ? 'date' : undefined"
        class="relative flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed"
        :class="cellButtonClass(cell)"
        @click="selectCell(cell)"
      >
        <span>{{ cell.day }}</span>
        <span
          v-if="cell.isToday && !cell.selected"
          class="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand/50"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

const props = defineProps({
  /** YYYY-MM-DD */
  modelValue: { type: String, default: '' },
  /** Минимальная дата (включительно), YYYY-MM-DD */
  min: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue'])

const RU_MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

const weekLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/**
 * @param {string} s
 */
function parseYmdLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? '').trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
  return new Date(y, mo, d)
}

/**
 * @param {Date} d
 */
function formatYmdLocal(d) {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

function syncViewFromProps() {
  const fromVal = parseYmdLocal(props.modelValue)
  const fromMin = parseYmdLocal(props.min)
  const base = fromVal && !Number.isNaN(fromVal.getTime()) ? fromVal : fromMin
  if (!base || Number.isNaN(base.getTime())) return
  viewYear.value = base.getFullYear()
  viewMonth.value = base.getMonth()
}

watch(
  () => [props.modelValue, props.min],
  () => {
    syncViewFromProps()
  },
  { immediate: true },
)

const monthTitle = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  if (!Number.isFinite(y) || m < 0 || m > 11) return ''
  return `${RU_MONTHS[m]} ${y}`
})

const minDate = computed(() => {
  const d = parseYmdLocal(props.min)
  return d
})

const todayYmd = computed(() => formatYmdLocal(new Date()))

const canPrevMonth = computed(() => {
  const min = minDate.value
  if (!min) return false
  const y = viewYear.value
  const m = viewMonth.value
  const lastPrev = new Date(y, m, 0)
  const minNorm = new Date(min.getFullYear(), min.getMonth(), min.getDate())
  lastPrev.setHours(0, 0, 0, 0)
  minNorm.setHours(0, 0, 0, 0)
  return lastPrev >= minNorm
})

const canNextMonth = computed(() => {
  const d = new Date()
  const cap = new Date(d.getFullYear() + 3, 11, 31)
  const y = viewYear.value
  const m = viewMonth.value
  const firstNext = new Date(y, m + 1, 1)
  return firstNext <= cap
})

function goPrevMonth() {
  if (!canPrevMonth.value) return
  let y = viewYear.value
  let m = viewMonth.value - 1
  if (m < 0) {
    m = 11
    y -= 1
  }
  viewYear.value = y
  viewMonth.value = m
}

function goNextMonth() {
  if (!canNextMonth.value) return
  let y = viewYear.value
  let m = viewMonth.value + 1
  if (m > 11) {
    m = 0
    y += 1
  }
  viewYear.value = y
  viewMonth.value = m
}

const cells = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const min = minDate.value
  if (!min || Number.isNaN(min.getTime())) return []

  const minNorm = new Date(min.getFullYear(), min.getMonth(), min.getDate())
  minNorm.setHours(0, 0, 0, 0)

  const first = new Date(y, m, 1)
  const dow = first.getDay()
  const mondayBased = dow === 0 ? 6 : dow - 1
  /** @type {Date} */
  let cur = new Date(y, m, 1 - mondayBased)

  const out = []
  const sel = String(props.modelValue || '').trim()

  for (let i = 0; i < 42; i++) {
    const inMonth = cur.getMonth() === m
    const ymd = formatYmdLocal(cur)
    const cmp = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate())
    cmp.setHours(0, 0, 0, 0)
    const disabled = cmp < minNorm
    const selected = Boolean(sel && sel === ymd)
    const isToday = ymd === todayYmd.value
    const day = cur.getDate()

    out.push({
      key: `${ymd}-${i}`,
      day,
      inMonth,
      ymd,
      disabled,
      selected,
      isToday,
    })
    cur.setDate(cur.getDate() + 1)
  }

  return out
})

/**
 * @param {{ inMonth: boolean, disabled: boolean, selected: boolean, isToday: boolean, ymd: string }} cell
 */
function cellButtonClass(cell) {
  if (cell.disabled) {
    return cell.inMonth ? 'text-slate-300' : 'text-slate-200'
  }
  if (cell.selected) {
    return 'bg-brand text-white shadow-md shadow-brand/25 ring-2 ring-brand/20 ring-offset-1 ring-offset-white'
  }
  if (!cell.inMonth) {
    return 'text-slate-400 hover:bg-slate-100/80 hover:text-slate-600'
  }
  return 'text-slate-800 hover:bg-brand-light/85 hover:text-brand-dark'
}

/**
 * @param {{ disabled: boolean, ymd: string }} cell
 */
function selectCell(cell) {
  if (cell.disabled) return
  emit('update:modelValue', cell.ymd)
}
</script>
