<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
    <div class="overflow-x-auto">
      <table class="min-w-[1040px] w-full border-collapse">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            <th class="px-4 py-3">ОТЕ</th>
            <th class="px-4 py-3">Автор</th>
            <th class="px-4 py-3">Удаление</th>
            <th class="px-4 py-3">Статус</th>
            <th class="px-4 py-3">Версии (бек / фронт)</th>
            <th class="px-4 py-3">Приложение</th>
            <th class="px-4 py-3">Действия</th>
            <th class="px-4 py-3">Карточка</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="px-4 py-10 text-center text-sm font-semibold text-slate-500">Нет окружений</td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="border-b border-slate-200 transition last:border-b-0 hover:bg-slate-50/80"
          >
            <td class="px-4 py-3">
              <NuxtLink
                :to="`/environments/${row.id}`"
                class="group flex items-center gap-2 font-extrabold text-brand hover:underline"
              >
                <Server class="size-4 shrink-0 text-slate-400 group-hover:text-brand" />
                <span>{{ row.oteName || row.name }}</span>
              </NuxtLink>
            </td>
            <td class="px-4 py-3" @click.stop>
              <div v-if="row.runBy" class="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <UserRound class="size-4 shrink-0 text-slate-400" />
                <a
                  v-if="profileHref(row.runBy)"
                  :href="profileHref(row.runBy)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
                  :title="profileHref(row.runBy)"
                >
                  {{ row.runBy }}
                </a>
                <span v-else>{{ row.runBy }}</span>
              </div>
              <span v-else class="text-sm text-slate-400">—</span>
            </td>
            <td class="px-4 py-3 font-mono text-sm text-slate-700">{{ row.deleteDate || '—' }}</td>
            <td class="px-4 py-3">
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
            </td>
            <td class="px-4 py-3 text-sm text-slate-700">
              <span class="font-mono text-xs">{{ row.versionBackend || '—' }}</span>
              <span class="mx-1 text-slate-300">/</span>
              <span class="font-mono text-xs">{{ row.versionFrontend || '—' }}</span>
            </td>
            <td class="px-4 py-3 align-top" @click.stop>
              <OteAppLinksCell :links="row.appLinks || []" :fallback-url="row.appUrl || ''" />
            </td>
            <td class="px-4 py-3" @click.stop>
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
                  v-if="row.status !== OTE_STATUS.DELETING && !row.tcOperationPending"
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
            <td class="px-4 py-3" @click.stop>
              <button
                type="button"
                class="flex size-8 items-center justify-center rounded-md border border-sky-200 bg-white text-brand transition hover:border-brand hover:bg-brand-light"
                aria-label="Карточка OTE"
                @click="go(row.id)"
              >
                <ChevronRight class="size-3.5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import {
  ChevronRight,
  Loader2,
  Play,
  Server,
  Square,
  Trash2,
  UserRound,
} from 'lucide-vue-next'
import { reactive } from 'vue'
import { $fetch } from 'ofetch'
import { notifyOteInstancesRefresh } from '~/composables/useOteInstancesBroadcast'
import { OTE_STATUS } from '~/constants/ote'
import { useEnvironmentsStore } from '~/stores/environments'

defineProps({
  rows: { type: Array, default: () => [] },
})

const router = useRouter()
const rt = useRuntimeConfig()
const toast = useToast()
const envStore = useEnvironmentsStore()

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

/**
 * Старт (TeamCity): есть хотя бы одна остановленная ВМ в группе.
 */
function rowCanStart(row) {
  if (row.tcOperationPending) return false
  if (row.status === OTE_STATUS.DELETING) return false
  const t = row.instances?.total
  const r = row.instances?.ready
  if (typeof t !== 'number' || t < 1) return false
  return typeof r === 'number' && r < t
}

/**
 * Стоп (TeamCity): все ВМ группы в статусе «включены» (ready === total).
 */
function rowCanStop(row) {
  if (row.tcOperationPending) return false
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

async function runDelete(row) {
  const id = row.id
  if (!id || row.status === OTE_STATUS.DELETING || row.tcOperationPending) return
  const name = row.oteName || row.name || id
  if (
    !window.confirm(
      `Удалить OTE «${name}»? В TeamCity будет поставлена сборка удаления по metadata.tag (как старт/стоп). Действие необратимо после выполнения сценария.`,
    )
  )
    return
  setBusy(id, 'delete', true)
  try {
    const res = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/teamcity`, {
      method: 'POST',
      body: { action: 'delete' },
      credentials: 'include',
    })
    const buildId = res?.teamCity?.buildId
    toast.show(`Сборка удаления в TeamCity поставлена в очередь${buildId ? ` (#${buildId})` : ''}.`, 'success')
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
