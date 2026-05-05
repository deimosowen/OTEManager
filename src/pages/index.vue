<template>
  <div class="space-y-10 pb-8">
    <OteDeleteConfirmModal
      v-model="deleteModalOpen"
      :ote-label="pendingDeleteLabel"
      :variant="deleteModalVariant"
      :confirm-loading="deleteConfirmLoading"
      @confirm="onDeleteModalConfirm"
    />

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

        <div
          v-else-if="store.listSource === 'no_folder'"
          class="relative mt-8 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-5 py-10 text-center"
        >
          <Server class="mx-auto size-10 text-amber-600/90" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold text-amber-950">{{ store.lastListError }}</p>
          <p class="mt-2 text-xs font-medium text-amber-900/80">После того как администратор укажет каталог, обновите страницу.</p>
          <AppButton type="button" variant="secondary" size="sm" class="mt-4 shadow-sm" @click="retryHomeEnvironments">
            Обновить список
          </AppButton>
        </div>

        <div
          v-else-if="store.listSource === 'error'"
          class="relative mt-8 rounded-2xl border border-rose-200/90 bg-rose-50/85 px-5 py-10 text-center"
        >
          <Server class="mx-auto size-10 text-rose-400" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold text-rose-900">{{ store.lastListError }}</p>
          <AppButton type="button" variant="secondary" size="sm" class="mt-4 shadow-sm" @click="retryHomeEnvironments">
            Повторить
          </AppButton>
        </div>

        <div v-else-if="!myOteRows.length" class="relative mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center">
          <Server class="mx-auto size-10 text-slate-300" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold text-slate-600">Пока нет окружений, отмеченных как ваши</p>
          <p class="mt-1 text-xs font-medium text-slate-400">После появления ВМ в каталоге с вашим участием они появятся здесь.</p>
        </div>

        <ul v-else class="relative mt-6 space-y-3">
          <li v-for="row in myOteRows" :key="row.id">
            <div
              class="overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50/90 to-white transition hover:border-brand/25 hover:shadow-md"
            >
              <div class="flex items-stretch gap-0">
              <NuxtLink
                :to="`/environments/${encodeURIComponent(row.id)}`"
                class="group flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 sm:gap-4"
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
                <ChevronRight
                  class="size-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand"
                />
              </NuxtLink>
              <div
                v-if="store.listSource === 'yc' || store.listSource === 'seed'"
                class="flex shrink-0 flex-wrap items-center justify-end gap-1 border-l border-slate-100/90 bg-white/50 px-2 py-2 sm:gap-1.5 sm:px-3"
                @click.stop
              >
                <template v-if="store.listSource === 'yc'">
                  <AppButton
                    v-if="rowCanStartYc(row)"
                    size="sm"
                    variant="primary"
                    class="!px-2.5 !py-1 !text-[11px]"
                    :loading="isRowBusy(row.id, 'tc-start')"
                    @click="ycTeamCity(row, 'start')"
                  >
                    <Play class="size-3 shrink-0" />
                    Старт
                  </AppButton>
                  <AppButton
                    v-if="rowCanStopYc(row)"
                    size="sm"
                    variant="warn"
                    class="!px-2.5 !py-1 !text-[11px]"
                    :loading="isRowBusy(row.id, 'tc-stop')"
                    @click="ycTeamCity(row, 'stop')"
                  >
                    <Square class="size-3 shrink-0" />
                    Стоп
                  </AppButton>
                  <AppButton
                    v-if="row.status !== OTE_STATUS.DELETING && !row.tcOperationPending && !row.oteTcCreationBlocking"
                    size="sm"
                    variant="danger"
                    class="!px-2 !py-1 !text-[11px]"
                    :loading="isRowBusy(row.id, 'delete')"
                    @click="openYcDelete(row)"
                  >
                    <Trash2 class="size-3 shrink-0" />
                  </AppButton>
                </template>
                <template v-else-if="store.listSource === 'seed'">
                  <AppButton
                    v-if="row.status !== OTE_STATUS.DELETING"
                    size="sm"
                    :variant="row.status === OTE_STATUS.RUNNING ? 'primary' : 'secondary'"
                    class="!px-2.5 !py-1 !text-[11px]"
                    @click="seedTogglePower(row)"
                  >
                    {{ row.status === OTE_STATUS.RUNNING ? 'Стоп' : 'Старт' }}
                  </AppButton>
                  <AppButton
                    v-if="row.status !== OTE_STATUS.DELETING"
                    size="sm"
                    variant="danger"
                    class="!px-2 !py-1 !text-[11px]"
                    @click="openSeedDelete(row)"
                  >
                    <Trash2 class="size-3 shrink-0" />
                  </AppButton>
                  <AppButton
                    v-if="row.status === OTE_STATUS.DELETING"
                    size="sm"
                    variant="danger"
                    class="!px-2.5 !py-1 !text-[11px]"
                    @click="openSeedDelete(row)"
                  >
                    Удалить
                  </AppButton>
                </template>
              </div>
              </div>
              <div
                v-if="store.listSource === 'yc' && row.oteTcCreationBlocking"
                class="border-t border-sky-100 bg-sky-50 px-4 py-2 text-[11px] font-semibold leading-snug text-sky-950"
              >
                {{
                  String(row.oteTcCreationBlocking?.presetId || '') === OTE_UPDATE_PRESET
                    ? 'Идёт обновление OTE'
                    : 'Идёт создание OTE'
                }}
                (запрос #{{ row.oteTcCreationBlocking.id }}). Старт, стоп, удаление и изменение даты удаления недоступны.
                <NuxtLink
                  :to="`/create/requests/${row.oteTcCreationBlocking.id}`"
                  class="ml-1 font-bold text-brand underline decoration-brand/30 underline-offset-2"
                >
                  Логи TeamCity
                </NuxtLink>
              </div>
            </div>
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
              <p class="mt-1 text-sm font-medium text-slate-500">
                Создание или обновление OTE в TeamCity — пока сборка не завершена.
              </p>
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
          <p class="mt-1 text-xs font-medium text-slate-400">
            Запустите создание или обновление OTE — статус появится здесь автоматически.
          </p>
        </div>

        <ul v-else class="relative mt-6 space-y-3">
          <li v-for="c in activeCreations" :key="c.id">
            <NuxtLink
              :to="`/create/requests/${c.id}`"
              class="flex flex-col gap-2 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white px-4 py-3.5 transition hover:border-amber-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="min-w-0">
                <p class="font-extrabold text-slate-900">{{ activeCreationRequestTitle(c) }}</p>
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ChevronRight,
  CirclePlus,
  LayoutGrid,
  Layers,
  Play,
  Server,
  Sparkles,
  Square,
  Trash2,
  Zap,
} from 'lucide-vue-next'
import { $fetch } from 'ofetch'
import { notifyOteInstancesRefresh, subscribeOteInstancesRefresh } from '~/composables/useOteInstancesBroadcast'
import { OTE_STATUS } from '~/constants/ote'
import { useEnvironmentsStore } from '~/stores/environments'
import { oteTcCreationStatusLabel } from '~/utils/ote-tc-creation-status.js'

const store = useEnvironmentsStore()
const toast = useToast()

const OTE_UPDATE_PRESET = 'build-template-update'

function activeCreationRequestTitle(c) {
  return String(c?.presetId || '') === OTE_UPDATE_PRESET
    ? `Обновление OTE · запрос #${c.id}`
    : `Создание OTE · запрос #${c.id}`
}

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

/** @type {Record<string, boolean>} */
const rowBusy = reactive({})

function busyKey(id, op) {
  return `${id}::${op}`
}

function isRowBusy(rowId, op) {
  return Boolean(rowBusy[busyKey(rowId, op)])
}

function setRowBusy(rowId, op, v) {
  rowBusy[busyKey(rowId, op)] = v
}

function rowCanStartYc(row) {
  if (row.tcOperationPending) return false
  if (row.oteTcCreationBlocking) return false
  if (row.status === OTE_STATUS.DELETING) return false
  const t = row.instances?.total
  const r = row.instances?.ready
  if (typeof t !== 'number' || t < 1) return false
  return typeof r === 'number' && r < t
}

function rowCanStopYc(row) {
  if (row.tcOperationPending) return false
  if (row.oteTcCreationBlocking) return false
  if (row.status === OTE_STATUS.DELETING) return false
  const t = row.instances?.total
  const r = row.instances?.ready
  return typeof t === 'number' && t > 0 && typeof r === 'number' && r === t
}

async function ycTeamCity(row, action) {
  const id = row.id
  if (!id) return
  const op = action === 'start' ? 'tc-start' : 'tc-stop'
  setRowBusy(id, op, true)
  try {
    const res = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/teamcity`, {
      method: 'POST',
      body: { action },
      credentials: 'include',
    })
    const buildId = res?.teamCity?.buildId
    toast.show(`Сборка TeamCity поставлена в очередь${buildId ? ` (#${buildId})` : ''}.`, 'success')
    try {
      await store.refreshFromYandexApi()
    } catch {
      /* ignore */
    }
    notifyOteInstancesRefresh()
  } catch (e) {
    const code = e?.statusCode ?? e?.response?.status
    if (code === 409) {
      toast.show(e?.data?.message || 'Операция TeamCity для этой OTE уже выполняется.', 'warn')
    } else {
      toast.show(e?.data?.message || e?.message || String(e), 'error')
    }
  } finally {
    setRowBusy(id, op, false)
  }
}

const deleteModalOpen = ref(false)
const deleteModalVariant = ref(/** @type {'yc' | 'seed'} */ ('yc'))
const pendingYcDeleteRow = ref(/** @type {any} */ (null))
const pendingSeedDelete = ref({ id: '', label: '' })

const pendingDeleteLabel = computed(() => {
  if (deleteModalVariant.value === 'seed') return pendingSeedDelete.value.label
  const row = pendingYcDeleteRow.value
  return row ? String(row.oteName || row.name || row.id || '') : ''
})

const deleteConfirmLoading = computed(() => {
  if (!deleteModalOpen.value) return false
  if (deleteModalVariant.value === 'yc') {
    const id = pendingYcDeleteRow.value?.id
    return id ? isRowBusy(id, 'delete') : false
  }
  return false
})

function openYcDelete(row) {
  if (!row?.id || row.status === OTE_STATUS.DELETING || row.tcOperationPending || row.oteTcCreationBlocking) return
  pendingYcDeleteRow.value = row
  pendingSeedDelete.value = { id: '', label: '' }
  deleteModalVariant.value = 'yc'
  deleteModalOpen.value = true
}

function openSeedDelete(row) {
  if (!row?.id) return
  pendingYcDeleteRow.value = null
  pendingSeedDelete.value = { id: String(row.id), label: displayOteName(row) }
  deleteModalVariant.value = 'seed'
  deleteModalOpen.value = true
}

async function onDeleteModalConfirm() {
  if (deleteModalVariant.value === 'seed') {
    const { id } = pendingSeedDelete.value
    if (!id) {
      deleteModalOpen.value = false
      return
    }
    store.remove(id)
    toast.show('Окружение удалено из списка', 'success')
    deleteModalOpen.value = false
    pendingSeedDelete.value = { id: '', label: '' }
    return
  }

  const row = pendingYcDeleteRow.value
  if (!row?.id) {
    deleteModalOpen.value = false
    return
  }
  const id = row.id
  setRowBusy(id, 'delete', true)
  try {
    const res = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/teamcity`, {
      method: 'POST',
      body: { action: 'delete' },
      credentials: 'include',
    })
    const buildId = res?.teamCity?.buildId
    toast.show(`Сборка удаления в TeamCity поставлена в очередь${buildId ? ` (#${buildId})` : ''}.`, 'success')
    deleteModalOpen.value = false
    pendingYcDeleteRow.value = null
    try {
      await store.refreshFromYandexApi()
    } catch {
      /* ignore */
    }
    notifyOteInstancesRefresh()
  } catch (e) {
    const sc = e?.statusCode ?? e?.response?.status
    toast.show(e?.data?.message || e?.message || String(e), sc === 409 ? 'warn' : 'error')
  } finally {
    setRowBusy(id, 'delete', false)
  }
}

function seedTogglePower(row) {
  if (!row || row.status === OTE_STATUS.DELETING) return
  const running = row.status === OTE_STATUS.RUNNING
  store.setRunning(row.id, !running)
  toast.show(running ? `OTE «${displayOteName(row)}» остановлена` : `OTE «${displayOteName(row)}» запущена`, running ? 'warn' : 'success')
}

let unsubEnvBroadcast = () => {}

watch(deleteModalOpen, (open) => {
  if (!open) {
    pendingYcDeleteRow.value = null
    pendingSeedDelete.value = { id: '', label: '' }
  }
})

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

async function retryHomeEnvironments() {
  try {
    await store.refreshFromYandexApi()
  } catch {
    /* lastListError уже в сторе */
  }
}

onMounted(async () => {
  unsubEnvBroadcast = subscribeOteInstancesRefresh(() => {
    if (store.listSource === 'yc' || store.listSource === 'no_folder') void store.refreshFromYandexApi().catch(() => {})
  })
  await Promise.all([
    store.refreshFromYandexApi().catch(() => {}),
    loadActiveCreations(),
  ])
  startPoll()
})

onBeforeUnmount(() => {
  unsubEnvBroadcast()
  if (pollTimer.value != null) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
})

useHead({ title: 'Главная · OTE Manager' })
</script>
