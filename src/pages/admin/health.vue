<template>
  <div class="health-page pb-10">
    <div
      class="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-brand shadow-card"
    >
      <div class="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand/20 blur-3xl" aria-hidden="true" />
      <div class="pointer-events-none absolute -bottom-16 left-1/3 size-64 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
      <div class="relative px-6 py-8 sm:px-10 sm:py-10">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-light/90">Мониторинг</p>
            <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Состояние сервисов</h1>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="accessPolicy === 'admins_only'"
              class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur"
            >
              Доступ: только список админов
            </span>
            <span
              v-else
              class="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-100 backdrop-blur"
            >
              Доступ: любой авторизованный
            </span>
            <AppButton
              variant="secondary"
              size="sm"
              class="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
              :loading="loading"
              @click="refresh"
            >
              <RefreshCw class="size-3.5" />
              Обновить
            </AppButton>
          </div>
        </div>

        <div v-if="meta && !error" class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Сводка</p>
            <p class="mt-1 flex items-center gap-2 text-lg font-extrabold text-white">
              <component :is="overallIcon" class="size-5 shrink-0" :class="overallIconClass" />
              {{ overallLabel }}
            </p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Проверка</p>
            <p class="mt-1 font-mono text-sm font-semibold text-white">{{ formatDateTimeMedium(meta.checkedAt) }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Длительность</p>
            <p class="mt-1 font-mono text-sm font-semibold text-white">{{ meta.durationMs }} ms</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Процесс Node</p>
            <p class="mt-1 font-mono text-sm font-semibold text-white">{{ formatUptime(meta.uptimeSeconds) }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-card">
      <div class="flex gap-3">
        <AlertTriangle class="size-6 shrink-0 text-rose-600" />
        <div>
          <h2 class="text-lg font-extrabold text-rose-900">Не удалось загрузить состояние</h2>
          <p class="mt-1 text-sm font-semibold text-rose-800">{{ error }}</p>
        </div>
      </div>
    </div>

    <div v-else-if="loading && !checks.length" class="grid animate-pulse gap-4 md:grid-cols-2">
      <div v-for="n in 3" :key="n" class="h-36 rounded-2xl bg-slate-200/80" />
    </div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
        <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-700">
          {{ meta?.app }}@{{ meta?.version || '0.0.0' }}
        </span>
        <span v-if="meta?.node" class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-700">
          {{ meta.node }}
        </span>
        <span v-if="meta?.buildSha" class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs text-emerald-900">
          build {{ meta.buildSha.slice(0, 12) }}
        </span>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="c in checks"
          :key="c.id"
          class="group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-card transition hover:shadow-md"
          :class="cardBorderClass(c.status)"
        >
          <div
            class="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl"
            :class="{
              'bg-emerald-500': c.status === 'ok',
              'bg-amber-500': c.status === 'warn',
              'bg-rose-500': c.status === 'error',
            }"
            aria-hidden="true"
          />
          <div class="pl-3">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <h2 class="text-base font-extrabold text-slate-900">{{ c.title }}</h2>
              <span
                class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                :class="badgeClass(c.status)"
              >
                {{ statusRu(c.status) }}
              </span>
            </div>
            <p class="mt-3 text-sm font-medium leading-relaxed text-slate-600">{{ c.detail }}</p>
            <ul v-if="c.hints?.length" class="mt-3 list-disc space-y-1 pl-4 text-xs font-semibold text-amber-800">
              <li v-for="(h, i) in c.hints" :key="i">{{ h }}</li>
            </ul>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup>
import { Activity, AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, XCircle } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { $fetch } from 'ofetch'
import { useUserTimeFormat } from '~/composables/useUserTimeFormat'

const { formatDateTimeMedium } = useUserTimeFormat()

const loading = ref(true)
const error = ref('')
const meta = ref(null)
const checks = ref([])
const overall = ref('ok')
const accessPolicy = ref('all_authenticated')

const rt = useRuntimeConfig()
const tcUi = computed(() => {
  const u = rt.public?.teamcityUiBaseUrl
  return typeof u === 'string' && u.trim() ? u.replace(/\/+$/, '') : ''
})

const overallLabel = computed(() => {
  if (overall.value === 'ok') return 'Все ключевые проверки пройдены'
  if (overall.value === 'warn') return 'Есть предупреждения'
  return 'Есть ошибки'
})

const overallIcon = computed(() => {
  if (overall.value === 'ok') return CheckCircle2
  if (overall.value === 'warn') return HelpCircle
  return XCircle
})

const overallIconClass = computed(() => {
  if (overall.value === 'ok') return 'text-emerald-400'
  if (overall.value === 'warn') return 'text-amber-400'
  return 'text-rose-400'
})

function cardBorderClass(status) {
  if (status === 'ok') return 'border-slate-200/90 hover:border-emerald-200'
  if (status === 'warn') return 'border-amber-200/80 hover:border-amber-300'
  return 'border-rose-200/80 hover:border-rose-300'
}

function badgeClass(status) {
  if (status === 'ok') return 'bg-emerald-100 text-emerald-900'
  if (status === 'warn') return 'bg-amber-100 text-amber-950'
  return 'bg-rose-100 text-rose-900'
}

function statusRu(s) {
  if (s === 'ok') return 'Норма'
  if (s === 'warn') return 'Внимание'
  return 'Ошибка'
}

function formatUptime(sec) {
  const s = Number(sec) || 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h} ч ${m} мин`
  if (m > 0) return `${m} мин ${r} с`
  return `${r} с`
}

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/ote/health', { credentials: 'include' })
    meta.value = res?.meta || null
    checks.value = Array.isArray(res?.checks) ? res.checks : []
    overall.value = res?.overall === 'warn' || res?.overall === 'error' ? res.overall : 'ok'
    accessPolicy.value = res?.accessPolicy === 'admins_only' ? 'admins_only' : 'all_authenticated'
  } catch (e) {
    error.value = e?.data?.message || e?.message || String(e)
    meta.value = null
    checks.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refresh()
})

useHead({ title: 'Состояние сервисов · OTE Manager' })
</script>
