<template>
  <div class="max-w-[min(960px,calc(100vw-2rem))]">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <NuxtLink
          to="/create"
          class="inline-flex items-center gap-1 text-xs font-bold text-slate-500 transition hover:text-brand"
        >
          <ArrowLeft class="size-3.5" aria-hidden="true" />
          К созданию OTE
        </NuxtLink>
        <h1 class="mt-2 text-[22px] font-extrabold tracking-tight text-slate-900">Создание OTE · запрос #{{ routeId }}</h1>
        <p class="mt-1 text-sm font-medium text-slate-500">
          Статус и лог сборки TeamCity обновляются автоматически.
        </p>
      </div>
      <div v-if="creation" class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-bold text-slate-600">Статус:</span>
        <span class="text-sm font-extrabold" :class="oteTcCreationStatusClass(creation.status)">
          {{ oteTcCreationStatusLabel(creation.status) }}
        </span>
      </div>
    </div>

    <div
      v-if="tcBanner"
      class="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
    >
      {{ tcBanner }}
      <NuxtLink to="/profile" class="ml-1 underline decoration-amber-700/40 underline-offset-2 hover:text-amber-950">
        Профиль → интеграции
      </NuxtLink>
    </div>

    <div v-if="loadError" class="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      {{ loadError }}
    </div>

    <div v-else-if="loading" class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-card">
      Загрузка…
    </div>

    <template v-else-if="creation">
      <div class="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-card">
        <a
          v-if="creation.teamcityWebUrl"
          :href="creation.teamcityWebUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
        >
          <ExternalLink class="size-4 shrink-0" aria-hidden="true" />
          Открыть сборку в TeamCity
        </a>
        <NuxtLink
          v-if="buildTemplateId"
          :to="`/templates/${buildTemplateId}`"
          class="text-sm font-bold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
        >
          Шаблон сборки
        </NuxtLink>
      </div>

      <p v-if="creation.lastError" class="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
        {{ creation.lastError }}
      </p>

      <section class="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-900 shadow-card ring-1 ring-slate-900/10">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 bg-slate-950/80 px-4 py-3">
          <h2 class="text-sm font-extrabold text-slate-100">Лог TeamCity</h2>
          <div class="flex items-center gap-2">
            <span v-if="logLoading" class="text-xs font-semibold text-slate-400">Обновление…</span>
            <button
              type="button"
              class="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-slate-700"
              @click="refreshLog"
            >
              Обновить сейчас
            </button>
          </div>
        </div>
        <p v-if="logHint" class="border-b border-slate-700/60 bg-slate-800/50 px-4 py-2 text-xs font-medium text-amber-100/90">
          {{ logHint }}
        </p>
        <div
          ref="logScrollRef"
          class="max-h-[min(70vh,720px)] overflow-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-emerald-100/95"
        >
          <pre v-if="logText" class="whitespace-pre-wrap break-words">{{ logText }}</pre>
          <p v-else class="text-slate-500">{{ logEmptyMessage }}</p>
        </div>
      </section>

      <dl v-if="creation.status === 'succeeded'" class="mt-6 space-y-3 rounded-2xl border border-slate-200/90 bg-white p-5 text-sm shadow-card">
        <div v-if="creation.metadataTag">
          <dt class="font-bold text-slate-700">metadata.tag</dt>
          <dd class="mt-0.5 font-mono text-xs text-slate-600">{{ creation.metadataTag }}</dd>
        </div>
        <div v-if="creation.caseoneVersion">
          <dt class="font-bold text-slate-700">caseone.version</dt>
          <dd class="mt-0.5 font-mono text-xs text-slate-600">{{ creation.caseoneVersion }}</dd>
        </div>
        <div v-if="creation.caseoneUrl">
          <dt class="font-bold text-slate-700">CaseOne</dt>
          <dd class="mt-0.5">
            <a :href="creation.caseoneUrl" class="break-all font-semibold text-brand hover:underline" target="_blank" rel="noopener">{{ creation.caseoneUrl }}</a>
          </dd>
        </div>
        <div v-if="creation.saasAppUrl">
          <dt class="font-bold text-slate-700">SaaS приложение</dt>
          <dd class="mt-0.5">
            <a :href="creation.saasAppUrl" class="break-all font-semibold text-brand hover:underline" target="_blank" rel="noopener">{{ creation.saasAppUrl }}</a>
          </dd>
        </div>
        <div v-if="creation.rabbitUrl">
          <dt class="font-bold text-slate-700">RabbitMQ</dt>
          <dd class="mt-0.5"><span class="break-all font-mono text-xs text-slate-600">{{ creation.rabbitUrl }}</span></dd>
        </div>
      </dl>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ExternalLink } from 'lucide-vue-next'
import { oteTcCreationStatusClass, oteTcCreationStatusLabel } from '~/utils/ote-tc-creation-status.js'

const route = useRoute()
const routeId = computed(() => String(route.params.id || ''))

const loading = ref(true)
const loadError = ref('')
const creation = ref(/** @type {any | null} */ (null))

const logText = ref('')
const logHint = ref('')
const logLoading = ref(false)
const logScrollRef = ref(/** @type {HTMLElement | null} */ (null))
const pollTimer = ref(/** @type {ReturnType<typeof setInterval> | null} */ (null))
/** Защита от параллельных bootstrap при быстрой смене маршрута */
let bootstrapGeneration = 0

const tcReady = ref(true)
const tcTokenSaved = ref(false)

const tcBanner = computed(() => {
  if (tcReady.value) return ''
  if (tcTokenSaved.value) return 'TeamCity доступен не полностью: проверьте токен в профиле.'
  return 'TeamCity недоступен: добавьте персональный токен в профиле.'
})

const buildTemplateId = computed(() => {
  const c = creation.value
  if (!c || c.buildTemplateId == null) return null
  const n = Number(c.buildTemplateId)
  return Number.isFinite(n) ? n : null
})

const logEmptyMessage = computed(() => {
  if (logHint.value) return ''
  return 'Текст лога появится после старта сборки на агенте.'
})

async function loadTcBanner() {
  try {
    const tc = await $fetch('/api/me/tc-credentials', { credentials: 'include' })
    tcReady.value = Boolean(tc?.teamcity?.ready)
    tcTokenSaved.value = Boolean(tc?.teamcity?.tokenSaved)
  } catch {
    tcReady.value = false
    tcTokenSaved.value = false
  }
}

async function refreshCreation(opts = /** @type {{ silent?: boolean }} */ ({})) {
  const id = routeId.value
  if (!id) return
  const requestForId = id
  try {
    const res = await $fetch(`/api/ote/create/requests/${encodeURIComponent(id)}`, {
      credentials: 'include',
      query: { _: Date.now() },
    })
    if (routeId.value !== requestForId) return
    if (res?.creation) creation.value = res.creation
  } catch (e) {
    if (routeId.value !== requestForId) return
    if (!opts.silent) loadError.value = e?.data?.message || e?.message || String(e)
  }
}

async function refreshLog() {
  const id = routeId.value
  if (!id) return
  const requestForId = id
  logLoading.value = true
  logHint.value = ''
  try {
    const res = await $fetch(`/api/ote/create/requests/${encodeURIComponent(id)}/log`, {
      credentials: 'include',
      /** не кэшировать ответ Nitro/ofetch между опросами */
      query: { _: Date.now() },
    })
    if (routeId.value !== requestForId) return
    logText.value = typeof res?.log === 'string' ? res.log : ''
    if (res?.truncated && res?.message) logHint.value = String(res.message)
    else if (res?.message) logHint.value = String(res.message)
    await nextTick()
    const el = logScrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  } catch (e) {
    if (routeId.value !== requestForId) return
    logHint.value = e?.data?.message || e?.message || 'Не удалось загрузить лог'
    logText.value = ''
  } finally {
    if (routeId.value === requestForId) logLoading.value = false
  }
}

function stopPoll() {
  if (pollTimer.value != null) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function startPoll() {
  stopPoll()
  pollTimer.value = setInterval(() => {
    void refreshCreation({ silent: true })
    void refreshLog()
  }, 5000)
}

async function bootstrapPage() {
  const gen = ++bootstrapGeneration
  await loadTcBanner()
  if (gen !== bootstrapGeneration) return
  loading.value = true
  loadError.value = ''
  logText.value = ''
  logHint.value = ''
  creation.value = null
  try {
    await refreshCreation()
    if (gen !== bootstrapGeneration) return
    if (!creation.value) {
      loadError.value = 'Запись не найдена'
    } else {
      await refreshLog()
      if (gen !== bootstrapGeneration) return
      startPoll()
    }
  } finally {
    if (gen === bootstrapGeneration) loading.value = false
  }
}

onMounted(() => {
  void bootstrapPage()
})

/** При смене id (SPA) сбрасываем состояние — иначе остаётся лог от другого запроса */
watch(
  () => route.params.id,
  (next, prev) => {
    if (next === prev || String(next || '') === String(prev || '')) return
    stopPoll()
    void bootstrapPage()
  },
)

onBeforeUnmount(() => stopPoll())

useHead({ title: () => `Создание OTE #${routeId.value} · OTE Manager` })
</script>
