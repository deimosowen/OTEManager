<template>
  <div>
    <OteDeleteConfirmModal
      v-model="seedDeleteModalOpen"
      :ote-label="seedDeleteLabel"
      variant="seed"
      @confirm="onSeedDeleteConfirm"
    />

    <div data-tour="tour-env-overview" class="mb-5 space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-[22px] font-extrabold tracking-tight text-slate-900">Окружения OTE</h1>
        <NuxtLink
          to="/create"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow transition hover:-translate-y-px hover:bg-brand-dark hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          <Plus class="size-3.5" />
          Создать новую OTE
        </NuxtLink>
      </div>

      <div
        v-if="store.listSource === 'yc' || store.listSource === 'seed'"
        class="flex flex-nowrap items-end gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div class="min-w-0 flex-1">
          <OteFiltersBar
            no-outer-margin
            :model-value="store.filters"
            :author-options="store.authorOptions"
            :type-options="store.typeOptions"
            @update:model-value="onFilters"
          />
        </div>
        <button
          v-if="store.listSource === 'yc'"
          type="button"
          class="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-brand/40 hover:text-brand sm:px-4"
          title="Настроить колонки таблицы"
          @click="openListColumnsModal"
        >
          <Columns3 class="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          Колонки
        </button>
      </div>
    </div>

    <OteListColumnsModal
      v-model="listColumnsModalOpen"
      :registry="listColumnsRegistry"
      :items="listColumnsItems"
      :grouped-value-layout="listColumnsGroupedLayout"
      @saved="onListColumnsSaved"
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

    <section
      v-else-if="store.listSource === 'no_folder'"
      class="rounded-2xl border border-amber-200 bg-amber-50/90 p-8 shadow-card"
    >
      <p class="text-sm font-semibold leading-relaxed text-amber-950">{{ store.lastListError }}</p>
      <p class="mt-2 text-xs font-medium text-amber-900/85">
        Когда администратор укажет каталог для вашей группы, список появится после обновления.
      </p>
      <AppButton type="button" variant="secondary" size="sm" class="mt-5 shadow-sm" @click="retryEnvironmentsLoad">
        Обновить
      </AppButton>
    </section>

    <section
      v-else-if="store.listSource === 'error'"
      class="rounded-2xl border border-rose-200 bg-rose-50/90 p-8 shadow-card"
    >
      <p class="text-sm font-semibold text-rose-900">{{ store.lastListError }}</p>
      <AppButton type="button" variant="secondary" size="sm" class="mt-5 shadow-sm" @click="retryEnvironmentsLoad">
        Повторить загрузку
      </AppButton>
    </section>

    <template v-else-if="store.listSource === 'yc'">
      <OteMvpYcTable
        :rows="store.filteredItems"
        :columns-layout="ycTableColumnsLayout"
        :grouped-value-layout="ycGroupedValueLayout"
      />
      <OteInstancesSummaryBlock v-if="store.tcTable?.summary" :summary="store.tcTable.summary" class="mt-4" />
      <details
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Columns3, Plus } from 'lucide-vue-next'
import {
  defaultOteGroupedValueLayoutForOteYc,
  defaultOteYcColumnPrefItems,
  OTE_YC_LIST_REGISTRY,
} from '@app-constants/ote-list-columns.js'
import { subscribeOteInstancesRefresh } from '~/composables/useOteInstancesBroadcast'
import { useEnvironmentsStore } from '~/stores/environments'
import { OTE_STATUS } from '~/constants/ote'

const store = useEnvironmentsStore()
const toast = useToast()

const listColumnsModalOpen = ref(false)
/** @type {import('vue').Ref<{ registry: typeof OTE_YC_LIST_REGISTRY, items: { id: string, visible: boolean }[], groupedValueLayout?: string } | null>} */
const ycListColumnPrefsPayload = ref(null)

const listColumnsRegistry = computed(() => ycListColumnPrefsPayload.value?.registry || OTE_YC_LIST_REGISTRY)
const listColumnsItems = computed(() => ycListColumnPrefsPayload.value?.items || defaultOteYcColumnPrefItems())
const listColumnsGroupedLayout = computed(
  () => ycListColumnPrefsPayload.value?.groupedValueLayout ?? defaultOteGroupedValueLayoutForOteYc(),
)
const ycGroupedValueLayout = listColumnsGroupedLayout

const ycTableColumnsLayout = computed(() => {
  const p = ycListColumnPrefsPayload.value
  if (!p?.items?.length) return null
  const reg = new Map(p.registry.map((c) => [c.id, c]))
  const out = []
  for (const it of p.items) {
    if (!it.visible) continue
    const def = reg.get(it.id)
    if (def) out.push({ id: def.id, label: def.label, category: def.category })
  }
  return out.length ? out : null
})

function openListColumnsModal() {
  listColumnsModalOpen.value = true
}

/** @param {Record<string, unknown>} res */
function onListColumnsSaved(res) {
  const registry = Array.isArray(res.registry) ? res.registry : OTE_YC_LIST_REGISTRY
  const items = Array.isArray(res.items) ? res.items : defaultOteYcColumnPrefItems()
  const groupedValueLayout =
    typeof res.groupedValueLayout === 'string' ? res.groupedValueLayout : defaultOteGroupedValueLayoutForOteYc()
  ycListColumnPrefsPayload.value = { registry, items, groupedValueLayout }
}

async function refreshYcListColumnPrefs() {
  try {
    ycListColumnPrefsPayload.value = await $fetch('/api/me/ote-list-columns', {
      credentials: 'include',
    })
  } catch {
    ycListColumnPrefsPayload.value = {
      registry: OTE_YC_LIST_REGISTRY,
      items: defaultOteYcColumnPrefItems(),
      groupedValueLayout: defaultOteGroupedValueLayoutForOteYc(),
    }
  }
}

const discoverPayload = ref('')
const discoverLoading = ref(false)
const discoverError = ref('')

watch(
  () => store.listSource,
  (src) => {
    if (src !== 'yc') {
      discoverPayload.value = ''
      discoverError.value = ''
    }
    if (src === 'yc') void refreshYcListColumnPrefs()
  },
  { immediate: true },
)

watch(listColumnsModalOpen, (open) => {
  if (open && store.listSource === 'yc') void refreshYcListColumnPrefs()
})

async function retryEnvironmentsLoad() {
  try {
    await store.refreshFromYandexApi()
  } catch {
    if (store.lastListError) {
      toast.show(store.lastListError, 'error')
    }
  }
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
  if (document.visibilityState !== 'visible') return
  if (store.listSource !== 'yc' && store.listSource !== 'no_folder') return
  void store.refreshFromYandexApi().catch(() => {})
}

onMounted(async () => {
  unsubBroadcast = subscribeOteInstancesRefresh(() => {
    if (store.listSource === 'yc' || store.listSource === 'no_folder') void store.refreshFromYandexApi().catch(() => {})
  })
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onListTabVisible)
  }
  try {
    await store.refreshFromYandexApi()
  } catch {
    if (store.listSource === 'error' && store.lastListError) {
      toast.show(`Не удалось загрузить окружения: ${store.lastListError}`, 'error')
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

const seedDeleteModalOpen = ref(false)
const seedDeleteId = ref('')
const seedDeleteLabel = ref('')

function onDelete(id) {
  const row = store.byId(id)
  if (!row) return
  seedDeleteId.value = id
  seedDeleteLabel.value = row.name || ''
  seedDeleteModalOpen.value = true
}

function onSeedDeleteConfirm() {
  const id = seedDeleteId.value
  const name = seedDeleteLabel.value
  if (!id) {
    seedDeleteModalOpen.value = false
    return
  }
  store.remove(id)
  toast.show(name ? `OTE «${name}» удалена` : 'Окружение удалено', 'error')
  seedDeleteModalOpen.value = false
  seedDeleteId.value = ''
  seedDeleteLabel.value = ''
}

useHead({ title: 'Окружения OTE · OTE Manager' })
</script>
