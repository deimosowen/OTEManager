<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[640px] border-collapse" :style="{ minWidth: tableMinWidthPx + 'px' }">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            <th v-for="col in displayCols" :key="col.id" class="px-4 py-3">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td :colspan="Math.max(1, displayCols.length)" class="px-4 py-10 text-center text-sm font-semibold text-slate-500">
              Нет окружений
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="border-b border-slate-200 transition last:border-b-0 hover:bg-slate-50/80"
          >
            <template v-for="col in displayCols" :key="`${row.id}::${col.id}`">
              <!-- ОТЕ -->
              <td v-if="col.id === 'ote'" class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <NuxtLink
                    :to="`/environments/${row.id}`"
                    class="group inline-flex items-center gap-2 font-extrabold text-brand hover:underline"
                  >
                    <Server class="size-4 shrink-0 text-slate-400 group-hover:text-brand" />
                    <span>{{ row.oteName || row.name }}</span>
                  </NuxtLink>
                  <OteProtectedBadge v-if="row.protected" />
                </div>
              </td>

              <!-- Автор -->
              <td v-else-if="col.id === 'author'" class="px-4 py-3" @click.stop>
                <template v-if="runBySegments(row).length">
                  <div
                    v-if="isGroupedMultiLine"
                    class="flex flex-col gap-0.5 text-sm font-semibold leading-snug text-slate-800"
                  >
                    <template v-for="(part, idx) in runBySegments(row)" :key="`${row.id}-rb-${idx}`">
                      <a
                        v-if="profileHref(part)"
                        :href="profileHref(part)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
                        :title="profileHref(part)"
                      >
                        {{ part }}
                      </a>
                      <span v-else>{{ part }}</span>
                    </template>
                  </div>
                  <div v-else class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-semibold text-slate-800">
                    <template v-for="(part, idx) in runBySegments(row)" :key="`${row.id}-rb-${idx}`">
                      <UserRound v-if="idx === 0" class="size-4 shrink-0 text-slate-400" />
                      <a
                        v-if="profileHref(part)"
                        :href="profileHref(part)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
                        :title="profileHref(part)"
                      >
                        {{ part }}
                      </a>
                      <span v-else>{{ part }}</span>
                      <span v-if="idx < runBySegments(row).length - 1" class="px-0.5 font-normal text-slate-300">/</span>
                    </template>
                  </div>
                </template>
                <span v-else class="text-sm text-slate-400">—</span>
              </td>

              <!-- Удаление -->
              <td v-else-if="col.id === 'deleteDate'" class="px-4 py-3 font-mono text-sm text-slate-700">
                <template v-if="groupedSegments(row.deleteDate).length">
                  <div v-if="isGroupedMultiLine" class="flex flex-col gap-0.5 leading-snug">
                    <span v-for="(p, i) in groupedSegments(row.deleteDate)" :key="`${row.id}-dd-${i}`">{{ p }}</span>
                  </div>
                  <span v-else>{{ row.deleteDate }}</span>
                </template>
                <span v-else>—</span>
              </td>

              <!-- Статус -->
              <td v-else-if="col.id === 'status'" class="px-4 py-3">
                <StatusBadge :status="row.status" />
                <div
                  v-if="row.tcOperationPending"
                  class="mt-2 flex max-w-[260px] flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold leading-snug text-amber-950"
                >
                  <div class="flex items-start gap-1.5">
                    <Loader2 class="mt-0.5 size-3.5 shrink-0 animate-spin text-amber-600" aria-hidden="true" />
                    <span>{{ tcPendingHint(row.tcOperationPending) }}</span>
                  </div>
                  <button
                    type="button"
                    class="self-start text-[10px] font-bold uppercase tracking-wide text-amber-900 underline decoration-amber-700/50 underline-offset-2 hover:decoration-amber-900"
                    @click="clearTcLock(row)"
                  >
                    Снять ожидание
                  </button>
                </div>
                <div
                  v-if="row.oteTcCreationBlocking"
                  class="mt-2 flex max-w-[260px] flex-col gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-[11px] font-semibold leading-snug text-sky-950"
                >
                  <span>{{ oteCreationBlockingHint(row.oteTcCreationBlocking) }}</span>
                  <NuxtLink
                    :to="`/create/requests/${row.oteTcCreationBlocking.id}`"
                    class="text-[10px] font-bold uppercase tracking-wide text-brand underline decoration-brand/30 underline-offset-2"
                  >
                    Запрос · логи TeamCity
                  </NuxtLink>
                </div>
              </td>

              <!-- Версии -->
              <td v-else-if="col.id === 'versions'" class="px-4 py-3 text-sm text-slate-700">
                <template v-if="!isGroupedMultiLine">
                  <span class="font-mono text-xs">{{ row.versionBackend || '—' }}</span>
                  <span class="mx-1 text-slate-300">/</span>
                  <span class="font-mono text-xs">{{ row.versionFrontend || '—' }}</span>
                </template>
                <div v-else class="flex flex-col gap-1.5 font-mono text-xs font-semibold leading-snug">
                  <div class="flex flex-col gap-0.5 rounded-md bg-slate-50/90 px-1.5 py-1 ring-1 ring-slate-100">
                    <template v-if="groupedSegments(row.versionBackend).length">
                      <span v-for="(p, i) in groupedSegments(row.versionBackend)" :key="`${row.id}-vb-${i}`">{{ p }}</span>
                    </template>
                    <span v-else>—</span>
                  </div>
                  <div class="flex flex-col gap-0.5 rounded-md bg-slate-50/90 px-1.5 py-1 ring-1 ring-slate-100">
                    <template v-if="groupedSegments(row.versionFrontend).length">
                      <span v-for="(p, i) in groupedSegments(row.versionFrontend)" :key="`${row.id}-vf-${i}`">{{ p }}</span>
                    </template>
                    <span v-else>—</span>
                  </div>
                </div>
              </td>

              <!-- Сумма vCPU / RAM по всем ВМ строки (как на карточке окружения) -->
              <td v-else-if="col.id === 'resourcesCpu'" class="whitespace-nowrap px-4 py-3 font-mono text-sm font-semibold text-slate-800">
                {{ formatListCores(row) }}
              </td>
              <td v-else-if="col.id === 'resourcesRam'" class="whitespace-nowrap px-4 py-3 font-mono text-sm font-semibold text-slate-800">
                {{ formatListRamGb(row) }}
              </td>

              <!-- Метки Yandex Cloud (см. /api/ote/discover): при нескольких ВМ в OTE значения через « / » -->
              <td
                v-else-if="col.id.startsWith(ycLblPrefix)"
                class="max-w-[240px] px-4 py-3 align-top text-slate-800"
              >
                <template v-if="ycLabelSegments(row, col.id).length">
                  <div
                    v-if="isGroupedMultiLine"
                    class="flex max-h-[200px] flex-col gap-0.5 overflow-y-auto font-mono text-[11px] font-semibold leading-snug"
                  >
                    <span v-for="(p, i) in ycLabelSegments(row, col.id)" :key="`${row.id}-${col.id}-${i}`">{{ p }}</span>
                  </div>
                  <span
                    v-else
                    class="line-clamp-4 whitespace-pre-wrap break-words font-mono text-[11px] font-semibold leading-snug"
                    :title="ycLabelTooltip(row, col.id)"
                  >{{ ycLabelCell(row, col.id) }}</span>
                </template>
                <span v-else class="text-sm text-slate-400">—</span>
              </td>

              <!-- Приложение -->
              <td v-else-if="col.id === 'app'" class="px-4 py-3 align-top" @click.stop>
                <OteAppLinksCell :links="row.appLinks || []" :fallback-url="row.appUrl || ''" />
              </td>

              <!-- Действия -->
              <td v-else-if="col.id === 'actions'" class="px-4 py-3" @click.stop>
                <div class="flex flex-wrap items-center gap-1.5">
                  <AppButton
                    v-if="rowCanStart(row)"
                    size="sm"
                    variant="primary"
                    class="!px-2.5 !py-1 !text-[11px]"
                    :loading="isBusy(row.id, 'tc-start')"
                    @click="runTeamCity(row, 'start')"
                  >
                    <Play class="size-3 shrink-0" />
                    Старт
                  </AppButton>
                  <AppButton
                    v-if="rowCanStop(row)"
                    size="sm"
                    variant="warn"
                    class="!px-2.5 !py-1 !text-[11px]"
                    :loading="isBusy(row.id, 'tc-stop')"
                    @click="runTeamCity(row, 'stop')"
                  >
                    <Square class="size-3 shrink-0" />
                    Стоп
                  </AppButton>
                  <AppButton
                    v-if="
                      row.status !== OTE_STATUS.DELETING &&
                      !row.tcOperationPending &&
                      !row.oteTcCreationBlocking &&
                      !row.protected
                    "
                    size="sm"
                    variant="danger"
                    class="!px-2 !py-1 !text-[11px]"
                    :loading="isBusy(row.id, 'delete')"
                    @click="runDelete(row)"
                  >
                    <Trash2 class="size-3 shrink-0" />
                  </AppButton>
                </div>
              </td>

              <!-- Карточка -->
              <td v-else-if="col.id === 'card'" class="px-4 py-3" @click.stop>
                <button
                  type="button"
                  class="flex size-8 items-center justify-center rounded-md border border-sky-200 bg-white text-brand transition hover:border-brand hover:bg-brand-light"
                  aria-label="Карточка OTE"
                  @click="go(row.id)"
                >
                  <ChevronRight class="size-3.5" />
                </button>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <OteDeleteConfirmModal
      v-model="deleteModalOpen"
      :ote-label="pendingDeleteLabel"
      variant="yc"
      :confirm-loading="pendingDeleteLoading"
      @confirm="onDeleteConfirm"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  ChevronRight,
  Loader2,
  Play,
  Server,
  Square,
  Trash2,
  UserRound,
} from 'lucide-vue-next'
import { $fetch } from 'ofetch'
import {
  OTE_YC_GROUPED_VALUE_JOIN_SLASH,
  OTE_YC_GROUPED_VALUE_MULTI_LINE,
  OTE_YC_LABEL_COLUMN_ID_PREFIX,
  OTE_YC_LIST_REGISTRY,
} from '@app-constants/ote-list-columns.js'
import { notifyOteInstancesRefresh } from '~/composables/useOteInstancesBroadcast'
import { splitOteGroupedFieldSegments } from '~/utils/ote-grouped-field-segments.js'
import { OTE_STATUS } from '~/constants/ote'
import { useEnvironmentsStore } from '~/stores/environments'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  /**
   * Видимые колонки слева направо. Если пусто — дефолт как в реестре.
   * @type {import('vue').PropType<{ id: string, label: string, category?: string }[]>}
   */
  columnsLayout: { type: Array, default: null },
  /** @see OTE_YC_GROUPED_VALUE_JOIN_SLASH | OTE_YC_GROUPED_VALUE_MULTI_LINE */
  groupedValueLayout: { type: String, default: OTE_YC_GROUPED_VALUE_JOIN_SLASH },
})

const router = useRouter()
const rt = useRuntimeConfig()
const toast = useToast()
const envStore = useEnvironmentsStore()

const ycLblPrefix = OTE_YC_LABEL_COLUMN_ID_PREFIX

const isGroupedMultiLine = computed(() => props.groupedValueLayout === OTE_YC_GROUPED_VALUE_MULTI_LINE)

/** @param {unknown} val */
function groupedSegments(val) {
  return splitOteGroupedFieldSegments(val)
}

/** @param {Record<string, unknown>} row @param {string} colId */
function ycLabelCell(row, colId) {
  const v = row[colId]
  if (v === undefined || v === null) return '—'
  const s = String(v).trim()
  return s || '—'
}

/** @param {Record<string, unknown>} row @param {string} colId */
function ycLabelTooltip(row, colId) {
  const s = ycLabelCell(row, colId)
  return s === '—' ? '' : s
}

/** @param {Record<string, unknown>} row @param {string} colId */
function ycLabelSegments(row, colId) {
  const cell = ycLabelCell(row, colId)
  return cell === '—' ? [] : splitOteGroupedFieldSegments(cell)
}

/** @param {Record<string, unknown>} row */
function runBySegments(row) {
  return splitOteGroupedFieldSegments(row.runBy)
}

/** @param {Record<string, unknown>} row */
function formatListCores(row) {
  const n = row.listTotalCores
  if (n === undefined || n === null || Number.isNaN(Number(n))) return '—'
  return String(Number(n))
}

/** @param {Record<string, unknown>} row */
function formatListRamGb(row) {
  const n = row.listTotalMemoryGb
  if (n === undefined || n === null || Number.isNaN(Number(n))) return '—'
  const v = Number(n)
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '')
}

const displayCols = computed(() => {
  const layout = props.columnsLayout
  if (Array.isArray(layout) && layout.length) return layout
  return OTE_YC_LIST_REGISTRY
})

const tableMinWidthPx = computed(() => {
  const n = displayCols.value.length
  return Math.max(640, n * 128)
})

const deleteModalOpen = ref(false)
const pendingDeleteRow = ref(/** @type {Record<string, unknown> | null} */ (null))

const pendingDeleteLabel = computed(() => {
  const row = pendingDeleteRow.value
  if (!row) return ''
  return String(row.oteName || row.name || row.id || '')
})

const pendingDeleteLoading = computed(() => {
  const row = pendingDeleteRow.value
  if (!row?.id) return false
  return isBusy(row.id, 'delete')
})

watch(deleteModalOpen, (open) => {
  if (!open) pendingDeleteRow.value = null
})

/** @type {Record<string, boolean>} */
const busy = reactive({})

function busyKey(rowId, op) {
  return `${rowId}::${op}`
}

function isBusy(rowId, op) {
  return Boolean(busy[busyKey(rowId, op)])
}

function setBusy(rowId, op, v) {
  busy[busyKey(rowId, op)] = v
}

function profileHref(login) {
  const t = rt.public.profileExternalUrlTemplate
  if (!t || !login) return ''
  return String(t)
    .replace(/\{user\}/g, encodeURIComponent(login))
    .replace(/\{login\}/g, encodeURIComponent(login))
}

function go(id) {
  if (!id) return
  router.push(`/environments/${id}`)
}

const OTE_UPDATE_PRESET = 'build-template-update'

function oteCreationBlockingHint(b) {
  if (!b?.id) return ''
  const upd = String(b?.presetId || '') === OTE_UPDATE_PRESET
  const kind = upd ? 'Обновление' : 'Создание'
  return `${kind} OTE ещё идёт (запрос #${b.id}). Действия с ВМ заблокированы до завершения сборки TeamCity.`
}

function rowCanStart(row) {
  if (row.tcOperationPending) return false
  if (row.oteTcCreationBlocking) return false
  if (row.status === OTE_STATUS.DELETING) return false
  const t = row.instances?.total
  const r = row.instances?.ready
  if (typeof t !== 'number' || t < 1) return false
  return typeof r === 'number' && r < t
}

function rowCanStop(row) {
  if (row.tcOperationPending) return false
  if (row.oteTcCreationBlocking) return false
  if (row.status === OTE_STATUS.DELETING) return false
  const t = row.instances?.total
  const r = row.instances?.ready
  return typeof t === 'number' && t > 0 && typeof r === 'number' && r === t
}

/** @param {{ action: string, progress?: { running: number, total: number } }} p */
async function clearTcLock(row) {
  const id = row.id
  if (!id) return
  try {
    await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/tc-pending-clear`, {
      method: 'POST',
      credentials: 'include',
    })
    toast.show('Ожидание TeamCity снято', 'success')
    try {
      await envStore.refreshFromYandexApi()
    } catch {
      /* ignore */
    }
    notifyOteInstancesRefresh()
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  }
}

function tcPendingHint(p) {
  if (!p) return ''
  const r = p.progress?.running ?? 0
  const t = p.progress?.total ?? 0
  if (p.action === 'start') {
    return `Запуск через TeamCity… ВМ в работе: ${r} из ${t}. Повторный запуск недоступен, пока не завершится сборка в TeamCity.`
  }
  if (p.action === 'delete') {
    return `Удаление через TeamCity… ВМ в каталоге: ${r} из ${t}. Повторные действия недоступны, пока не завершится сборка в TeamCity.`
  }
  if (p.action === 'modify_delete_date') {
    return 'Изменение даты автоудаления через TeamCity… Повторные действия недоступны, пока сборка не завершится.'
  }
  return `Остановка через TeamCity… ВМ в работе: ${r} из ${t}. Повторная остановка недоступна, пока не завершится сборка в TeamCity.`
}

async function runTeamCity(row, action) {
  const id = row.id
  if (!id) return
  const op = action === 'start' ? 'tc-start' : 'tc-stop'
  setBusy(id, op, true)
  try {
    const res = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/teamcity`, {
      method: 'POST',
      body: { action },
      credentials: 'include',
    })
    const buildId = res?.teamCity?.buildId
    toast.show(`Сборка TeamCity поставлена в очередь${buildId ? ` (#${buildId})` : ''}.`, 'success')
    try {
      await envStore.refreshFromYandexApi()
    } catch {
      /* список обновится при следующем опросе */
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
    setBusy(id, op, false)
  }
}

function runDelete(row) {
  const id = row.id
  if (!id || row.status === OTE_STATUS.DELETING || row.tcOperationPending || row.oteTcCreationBlocking) return
  pendingDeleteRow.value = row
  deleteModalOpen.value = true
}

async function onDeleteConfirm() {
  const row = pendingDeleteRow.value
  if (!row?.id) {
    deleteModalOpen.value = false
    return
  }
  const id = row.id
  setBusy(id, 'delete', true)
  try {
    const res = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/teamcity`, {
      method: 'POST',
      body: { action: 'delete' },
      credentials: 'include',
    })
    const buildId = res?.teamCity?.buildId
    toast.show(`Сборка удаления в TeamCity поставлена в очередь${buildId ? ` (#${buildId})` : ''}.`, 'success')
    deleteModalOpen.value = false
    pendingDeleteRow.value = null
    try {
      await envStore.refreshFromYandexApi()
    } catch {
      /* список обновится при следующем опросе */
    }
    notifyOteInstancesRefresh()
  } catch (e) {
    const sc = e?.statusCode ?? e?.response?.status
    const msg = e?.data?.message || e?.message || String(e)
    toast.show(msg, sc === 409 ? 'warn' : 'error')
  } finally {
    setBusy(id, 'delete', false)
  }
}
</script>
