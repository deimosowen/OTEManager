<template>
  <div class="space-y-10 pb-8">
    <!-- Hero -->
    <section
      class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-brand via-brand-mid to-sky-500 px-6 py-8 text-white shadow-card-md sm:px-10 sm:py-10"
    >
      <div
        class="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -bottom-16 left-0 size-56 rounded-full bg-sky-300/25 blur-2xl"
        aria-hidden="true"
      />
      <div class="relative max-w-4xl">
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-white/85">Добро пожаловать</p>
        <h1 class="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Рабочий стол OTE</h1>
        <div class="mt-3 max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
          <p class="w-max whitespace-nowrap text-sm font-medium leading-relaxed text-white/95 sm:text-[15px]">
            Ваши окружения и текущие операции в одном месте. Полный список и фильтры — в разделе «Окружения OTE».
          </p>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <NuxtLink
            to="/environments"
            class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-brand shadow-lg shadow-slate-900/15 transition hover:bg-slate-50"
          >
            <LayoutGrid class="size-4" aria-hidden="true" />
            Все окружения
          </NuxtLink>
          <NuxtLink
            to="/create"
            class="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <CirclePlus class="size-4" aria-hidden="true" />
            Создать OTE
          </NuxtLink>
        </div>
      </div>
    </section>

    <div class="grid gap-8 lg:grid-cols-2 lg:items-start">
      <!-- Мои OTE -->
      <section
        class="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card ring-1 ring-slate-900/[0.04] transition hover:shadow-card-md sm:p-7"
      >
        <div
          class="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-brand/[0.07] to-transparent opacity-0 transition group-hover:opacity-100"
          aria-hidden="true"
        />
        <div class="relative flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-sky-500 text-white shadow-md shadow-brand/25"
            >
              <Layers class="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 class="text-lg font-extrabold tracking-tight text-slate-900">Мои окружения</h2>
              <p class="mt-1 text-sm font-medium text-slate-500">Кратко: тег, состояние, ссылка на карточку.</p>
            </div>
          </div>
          <NuxtLink
            to="/environments"
            class="text-xs font-extrabold text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
          >
            Полный список
          </NuxtLink>
        </div>

        <div v-if="store.listSource === 'pending'" class="relative mt-6 space-y-3">
          <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-2xl bg-slate-100" />
        </div>

        <div v-else-if="!myOteRows.length" class="relative mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center">
          <Server class="mx-auto size-10 text-slate-300" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold text-slate-600">Пока нет окружений, отмеченных как ваши</p>
          <p class="mt-1 text-xs font-medium text-slate-400">После появления ВМ в каталоге с вашим участием они появятся здесь.</p>
        </div>

        <ul v-else class="relative mt-6 space-y-3">
          <li v-for="row in myOteRows" :key="row.id">
            <NuxtLink
              :to="`/environments/${encodeURIComponent(row.id)}`"
              class="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3.5 transition hover:border-brand/25 hover:shadow-md"
            >
              <span
                class="size-2.5 shrink-0 rounded-full"
                :class="
                  row.status === 'running'
                    ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
                    : row.status === 'deleting'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                "
                aria-hidden="true"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate font-extrabold text-slate-900">{{ displayOteName(row) }}</p>
                <p class="mt-0.5 truncate text-xs font-medium text-slate-500">
                  <span v-if="row.oteName && row.oteName !== row.name" class="font-mono">{{ row.oteName }}</span>
                  <span v-if="row.versionBackend" class="text-slate-400"> · {{ row.versionBackend }}</span>
                  <span v-if="row.runBy" class="text-slate-400"> · {{ row.runBy }}</span>
                </p>
              </div>
              <ChevronRight class="size-5 shrink-0 text-slate-300 transition group-hover:text-brand group-hover:translate-x-0.5" />
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- Активные операции -->
      <section
        class="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card ring-1 ring-slate-900/[0.04] transition hover:shadow-card-md sm:p-7"
      >
        <div
          class="pointer-events-none absolute -left-8 bottom-0 h-36 w-36 rounded-full bg-gradient-to-tr from-amber-400/10 to-transparent opacity-0 transition group-hover:opacity-100"
          aria-hidden="true"
        />
        <div class="relative flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30"
            >
              <Zap class="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 class="text-lg font-extrabold tracking-tight text-slate-900">Активные операции</h2>
              <p class="mt-1 text-sm font-medium text-slate-500">Создание OTE в TeamCity — пока сборка не завершена.</p>
            </div>
          </div>
        </div>

        <div v-if="activeLoading && !activeCreations.length" class="relative mt-6 space-y-3">
          <div v-for="n in 2" :key="n" class="h-[4.5rem] animate-pulse rounded-2xl bg-slate-100" />
        </div>

        <div
          v-else-if="!activeCreations.length"
          class="relative mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center"
        >
          <Sparkles class="mx-auto size-10 text-slate-300" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold text-slate-600">Нет активных сборок</p>
          <p class="mt-1 text-xs font-medium text-slate-400">Запустите создание OTE — статус появится здесь автоматически.</p>
        </div>

        <ul v-else class="relative mt-6 space-y-3">
          <li v-for="c in activeCreations" :key="c.id">
            <NuxtLink
              :to="`/create/requests/${c.id}`"
              class="flex flex-col gap-2 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white px-4 py-3.5 transition hover:border-amber-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="min-w-0">
                <p class="font-extrabold text-slate-900">Создание OTE · запрос #{{ c.id }}</p>
                <p class="mt-0.5 text-xs font-medium text-slate-500">
                  <span v-if="c.teamcityBuildId" class="font-mono">build {{ c.teamcityBuildId }}</span>
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-3">
                <span
                  class="rounded-full px-3 py-1 text-xs font-extrabold ring-1 ring-black/[0.06]"
                  :class="creationStatusPillClass(c.status)"
                >
                  {{ oteTcCreationStatusLabel(c.status) }}
                </span>
                <span class="inline-flex items-center gap-1 text-xs font-extrabold text-brand">
                  Лог
                  <ChevronRight class="size-4" />
                </span>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ChevronRight,
  CirclePlus,
  LayoutGrid,
  Layers,
  Server,
  Sparkles,
  Zap,
} from 'lucide-vue-next'
import { useEnvironmentsStore } from '~/stores/environments'
import { oteTcCreationStatusLabel } from '~/utils/ote-tc-creation-status.js'

const store = useEnvironmentsStore()

function creationStatusPillClass(s) {
  if (s === 'queued') return 'bg-amber-100 text-amber-950'
  if (s === 'running') return 'bg-sky-100 text-sky-950'
  return 'bg-slate-100 text-slate-800'
}

const activeCreations = ref(/** @type {any[]} */ ([]))
const activeLoading = ref(true)
const pollTimer = ref(/** @type {ReturnType<typeof setInterval> | null} */ (null))

const myOteRows = computed(() => {
  const list = Array.isArray(store.items) ? store.items : []
  return list.filter((r) => r && r.mine).slice(0, 8)
})

function displayOteName(row) {
  return String(row.name || row.oteName || `OTE ${row.id}`).trim() || `OTE ${row.id}`
}

async function loadActiveCreations() {
  try {
    const res = await $fetch('/api/ote/create/requests', {
      credentials: 'include',
      query: { _: Date.now() },
    })
    activeCreations.value = Array.isArray(res?.creations) ? res.creations : []
  } catch {
    activeCreations.value = []
  } finally {
    activeLoading.value = false
  }
}

function startPoll() {
  if (pollTimer.value != null) clearInterval(pollTimer.value)
  pollTimer.value = setInterval(() => {
    void loadActiveCreations()
  }, 10000)
}

onMounted(async () => {
  try {
    await store.refreshFromYandexApi()
  } catch {
    /* ignore — store покажет seed при ошибке */
  }
  await loadActiveCreations()
  startPoll()
})

onBeforeUnmount(() => {
  if (pollTimer.value != null) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
})

useHead({ title: 'Главная · OTE Manager' })
</script>
