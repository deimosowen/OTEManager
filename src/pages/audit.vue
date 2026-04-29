<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-[22px] font-extrabold text-slate-900">Аудит действий</h1>
      <AppButton variant="secondary" size="md" :loading="loading" @click="load">Обновить</AppButton>
    </div>

    <div class="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <div class="min-w-[160px] flex-1 sm:max-w-[220px]">
        <AppSelect v-model="filterAction" label="Действие" :options="AUDIT_ACTION_FILTER_OPTIONS" />
      </div>
      <div class="flex items-end gap-1.5">
        <div>
          <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">С</label>
          <input
            v-model="filterDateFrom"
            type="date"
            class="w-[132px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </div>
        <div>
          <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">По</label>
          <input
            v-model="filterDateTo"
            type="date"
            class="w-[132px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </div>
      </div>
      <div class="min-w-0 w-full flex-[2] sm:w-auto">
        <label class="mb-1 block text-sm font-bold text-slate-800">Поиск</label>
        <input
          v-model="searchDraft"
          type="search"
          autocomplete="off"
          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          placeholder="Логин, почта, тег, id ресурса…"
        />
      </div>
    </div>

    <div v-if="error" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
      {{ error }}
    </div>

    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div class="overflow-x-auto">
        <table class="min-w-[920px] w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3">Время (UTC)</th>
              <th class="px-4 py-3">Действие</th>
              <th class="px-4 py-3">Логин</th>
              <th class="px-4 py-3">Почта</th>
              <th class="px-4 py-3">Метка / тег</th>
              <th class="px-4 py-3">Ресурс</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-10 text-center font-semibold text-slate-500">Загрузка…</td>
            </tr>
            <template v-else>
              <tr v-if="!rows.length">
                <td colspan="6" class="px-4 py-10 text-center font-semibold text-slate-500">Записей не найдено</td>
              </tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="border-b border-slate-100 last:border-b-0">
                  <td class="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-800">{{ formatUtc(r.occurredAt) }}</td>
                  <td class="px-4 py-2.5 font-semibold text-slate-900">{{ labelFor(r.actionCode) }}</td>
                  <td class="px-4 py-2.5 text-slate-700">{{ r.actorLogin || '—' }}</td>
                  <td class="max-w-[220px] truncate px-4 py-2.5 text-slate-700" :title="r.actorEmail">{{ r.actorEmail || '—' }}</td>
                  <td class="max-w-[200px] truncate px-4 py-2.5 font-mono text-xs text-slate-700" :title="r.oteTag || ''">
                    {{ r.oteTag || '—' }}
                  </td>
                  <td class="max-w-[200px] truncate px-4 py-2.5 font-mono text-xs text-slate-600" :title="r.oteResourceId || ''">
                    <NuxtLink v-if="r.oteResourceId" :to="resourceHref(r.oteResourceId)" class="text-brand hover:underline">
                      {{ r.oteResourceId }}
                    </NuxtLink>
                    <span v-else>—</span>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
      <div
        v-if="total > 0"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-600"
      >
        <span>Всего: {{ total }} · стр. {{ page }} из {{ totalPages }}</span>
        <div class="flex flex-wrap gap-2">
          <AppButton variant="secondary" size="sm" class="!text-xs" :disabled="page <= 1 || loading" @click="goPage(page - 1)">
            Назад
          </AppButton>
          <AppButton variant="secondary" size="sm" class="!text-xs" :disabled="page >= totalPages || loading" @click="goPage(page + 1)">
            Вперёд
          </AppButton>
        </div>
      </div>
      <p v-if="syncedAt" class="border-t border-slate-100 px-4 py-2 text-xs font-semibold text-slate-400">
        Обновлено: {{ syncedAt }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuditListSearch } from '~/composables/useAuditListSearch'
import { AUDIT_ACTION_FILTER_OPTIONS, AUDIT_LIST_PAGE_SIZE, AUDIT_SEARCH_DEBOUNCE_MS, auditActionLabel } from '~/constants/audit'

const rows = ref([])
const loading = ref(true)
const error = ref('')
const syncedAt = ref('')
const total = ref(0)
const page = ref(1)

const filterAction = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

const debounceSec = computed(() => Math.round(AUDIT_SEARCH_DEBOUNCE_MS / 1000))

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / AUDIT_LIST_PAGE_SIZE)))

function labelFor(code) {
  return auditActionLabel(code)
}

/** Ссылка из колонки «Ресурс»: шаблоны сборок → /templates/:id, иначе карточка OTE */
function resourceHref(oteResourceId) {
  if (!oteResourceId) return '/'
  const s = String(oteResourceId)
  const m = /^build-template:(\d+)$/.exec(s)
  if (m) return `/templates/${m[1]}`
  return `/environments/${encodeURIComponent(s)}`
}

function formatUtc(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' Z')
}

function queryPayload() {
  const q = { page: String(page.value) }
  if (filterAction.value) q.actionCode = filterAction.value
  if (searchQuery.value) q.search = searchQuery.value
  if (filterDateFrom.value) q.dateFrom = filterDateFrom.value
  if (filterDateTo.value) q.dateTo = filterDateTo.value
  return q
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/ote/audit', { credentials: 'include', query: queryPayload() })
    rows.value = Array.isArray(res?.items) ? res.items : []
    total.value = typeof res?.total === 'number' ? res.total : Number(res?.total) || 0
    if (typeof res?.page === 'number' && res.page >= 1) page.value = res.page
    syncedAt.value = res?.syncedAt || ''
  } catch (e) {
    error.value = e?.data?.message || e?.message || String(e)
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function commitSearch() {
  page.value = 1
  void load()
}

const { searchDraft, searchQuery } = useAuditListSearch(commitSearch)

function goPage(p) {
  page.value = Math.min(Math.max(1, p), totalPages.value)
  void load()
}

watch([filterAction, filterDateFrom, filterDateTo], () => {
  page.value = 1
  void load()
})

onMounted(() => {
  void load()
})

useHead({ title: 'Аудит · OTE Manager' })
</script>
