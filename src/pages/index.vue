<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-[22px] font-extrabold text-slate-900">Окружения OTE</h1>
      <NuxtLink
        to="/create"
        class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow transition hover:-translate-y-px hover:bg-brand-dark hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <Plus class="size-3.5" />
        Создать новую OTE
      </NuxtLink>
    </div>

    <OteFiltersBar
      v-if="store.listSource !== 'pending' && (store.listSource !== 'yc' || ycView === 'mvp')"
      :model-value="store.filters"
      :product-options="store.productOptions"
      :type-options="store.typeOptions"
      @update:model-value="onFilters"
    />

    <section
      v-if="store.listSource === 'pending'"
      class="rounded-2xl border border-slate-200 bg-white p-8 shadow-card"
      aria-busy="true"
      aria-label="Загрузка списка окружений"
    >
      <div class="mb-6 h-6 w-56 max-w-full animate-pulse rounded-lg bg-slate-200" />
      <div class="space-y-3">
        <div v-for="n in 8" :key="n" class="h-11 w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
      <p class="mt-6 text-center text-sm font-semibold text-slate-500">Загружаем список из Yandex Cloud…</p>
    </section>

    <template v-else-if="store.listSource === 'yc'">
      <div class="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button type="button" :class="ycTabClass(ycView === 'mvp')" @click="ycView = 'mvp'">Список OTE</button>
        <button type="button" :class="ycTabClass(ycView === 'tc')" @click="ycView = 'tc'">ВМ и квоты</button>
      </div>
      <OteMvpYcTable v-show="ycView === 'mvp'" :rows="store.filteredItems" />
      <OteTeamCityReportTable v-show="ycView === 'tc' && store.tcTable" :tc-table="store.tcTable" />
      <details
        v-if="ycView === 'mvp'"
        class="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700"
        @toggle="onDiscoverToggle"
      >
        <summary class="cursor-pointer font-bold text-slate-800">Какие ключи меток и metadata есть в каталоге?</summary>
        <p class="mb-2 mt-2 text-xs text-slate-500">
          Ответ <code class="rounded bg-white px-1">GET /api/ote/discover</code> — подсказка для переменных
          <code class="rounded bg-white px-1">NUXT_YC_*</code>. В консоли YC: карточка ВМ → «Метки» и «Метаданные».
        </p>
        <pre
          v-if="discoverPayload"
          class="max-h-[420px] overflow-auto rounded-lg bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-800"
        >{{ discoverPayload }}</pre>
        <p v-else-if="discoverLoading" class="text-xs text-slate-500">Загрузка…</p>
        <p v-else-if="discoverError" class="text-xs font-semibold text-rose-600">{{ discoverError }}</p>
      </details>
    </template>

    <OteEnvironmentsTable
      v-else-if="store.listSource === 'seed'"
      :rows="store.filteredItems"
      @toggle-power="onToggle"
      @delete="onDelete"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { subscribeOteInstancesRefresh } from '~/composables/useOteInstancesBroadcast'
import { useEnvironmentsStore } from '~/stores/environments'
import { OTE_STATUS } from '~/constants/ote'

const store = useEnvironmentsStore()
const toast = useToast()

/** Вкладка при данных из YC: MVP-список или таблица TeamCity */
const ycView = ref('mvp')
const discoverPayload = ref('')
const discoverLoading = ref(false)
const discoverError = ref('')

watch(
  () => store.listSource,
  (src) => {
    if (src !== 'yc') {
      ycView.value = 'mvp'
      discoverPayload.value = ''
      discoverError.value = ''
    }
  },
)

function ycTabClass(active) {
  return active
    ? 'rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-brand-dark'
    : 'rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50'
}

async function onDiscoverToggle(ev) {
  const el = ev.target
  if (!(el instanceof HTMLDetailsElement) || !el.open) return
  if (discoverPayload.value || discoverLoading.value) return
  discoverLoading.value = true
  discoverError.value = ''
  try {
    const d = await $fetch('/api/ote/discover', { credentials: 'include' })
    discoverPayload.value = JSON.stringify(d, null, 2)
  } catch (e) {
    discoverError.value = e?.data?.message || e?.message || String(e)
  } finally {
    discoverLoading.value = false
  }
}

let tcPollTimer = null

function clearTcPoll() {
  if (tcPollTimer != null) {
    clearInterval(tcPollTimer)
    tcPollTimer = null
  }
}

/** Пока есть незавершённая операция TeamCity — периодически обновляем список из YC (снимется блокировка на сервере). */
watch(
  () =>
    store.listSource === 'yc' &&
    Array.isArray(store.items) &&
    store.items.some((i) => i && i.tcOperationPending),
  (active) => {
    clearTcPoll()
    if (!active) return
    tcPollTimer = setInterval(() => {
      void store.refreshFromYandexApi().catch(() => {})
    }, 12000)
  },
  { immediate: true },
)

let unsubBroadcast = () => {}

function onListTabVisible() {
  if (typeof document === 'undefined') return
  if (document.visibilityState !== 'visible' || store.listSource !== 'yc') return
  void store.refreshFromYandexApi().catch(() => {})
}

onMounted(async () => {
  unsubBroadcast = subscribeOteInstancesRefresh(() => {
    if (store.listSource === 'yc') void store.refreshFromYandexApi().catch(() => {})
  })
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onListTabVisible)
  }
  try {
    await store.refreshFromYandexApi()
  } catch {
    if (store.lastListError) {
      toast.show(`Облако: ${store.lastListError}. Показаны демо-данные.`, 'warn')
    }
  }
})

onUnmounted(() => {
  clearTcPoll()
  unsubBroadcast()
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onListTabVisible)
  }
})

function onFilters(v) {
  Object.assign(store.filters, v)
}

function onToggle(id) {
  const row = store.byId(id)
  if (!row || row.status === OTE_STATUS.DELETING) return
  const running = row.status === OTE_STATUS.RUNNING
  store.setRunning(id, !running)
  toast.show(running ? `OTE «${row.name}» остановлена` : `OTE «${row.name}» запущена`, running ? 'warn' : 'success')
}

function onDelete(id) {
  const row = store.byId(id)
  if (!row) return
  if (!confirm(`Удалить OTE «${row.name}»?`)) return
  store.remove(id)
  toast.show(`OTE «${row.name}» удалена`, 'error')
}
</script>
