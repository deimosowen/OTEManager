<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-[22px] font-extrabold text-slate-900">Шаблоны деплоя</h1>
      <AppButton @click="goNew">Новый шаблон</AppButton>
    </div>

    <p class="mb-4 max-w-3xl text-sm font-semibold text-slate-600">
      YAML-конфигурации для создания OTE через TeamCity.
    </p>

    <div v-if="error" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
      {{ error }}
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-2.5">
      <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Показать</span>
      <div class="inline-flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-inner">
        <button
          v-for="opt in personalFilterOptions"
          :key="opt.value"
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
          :class="
            personalFilter === opt.value
              ? 'bg-white text-brand shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
          "
          @click="setPersonalFilter(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div class="overflow-x-auto">
        <table class="min-w-[880px] w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3">Название</th>
              <th class="px-4 py-3">Тип (ОС)</th>
              <th class="px-4 py-3">Доступ</th>
              <th class="px-4 py-3">Изменён (UTC)</th>
              <th class="px-4 py-3">Автор изменения</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="px-4 py-10 text-center font-semibold text-slate-500">Загрузка…</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="5" class="px-4 py-10 text-center font-semibold text-slate-500">
                Шаблонов пока нет.
                <NuxtLink to="/templates/new" class="font-bold text-brand hover:underline">Создать первый</NuxtLink>
              </td>
            </tr>
            <tr v-for="r in rows" :key="r.id" class="border-b border-slate-100 last:border-b-0">
              <td class="px-4 py-2.5">
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                  <NuxtLink :to="`/templates/${r.id}`" class="min-w-0 font-bold text-brand hover:underline">
                    <span class="break-words">{{ r.name }}</span>
                  </NuxtLink>
                  <PersonalTemplateBadge v-if="r.isPersonal" class="shrink-0" />
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-2.5 text-sm font-semibold text-slate-700">
                {{ osLabel(r.targetOs) }}
              </td>
              <td class="whitespace-nowrap px-4 py-2.5">
                <span
                  v-if="r.isPersonal"
                  class="inline-flex items-center gap-1 rounded-lg border border-violet-100 bg-violet-50/80 px-2 py-1 text-xs font-bold text-violet-900"
                >
                  <Lock class="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
                  Только автор
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600"
                >
                  <Users class="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                  Общий
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-800">{{ formatUtc(r.updatedAt) }}</td>
              <td class="max-w-[240px] truncate px-4 py-2.5 text-slate-700" :title="r.updatedByEmail || ''">
                {{ r.updatedByLogin || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Lock, Users } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { labelDeploymentTemplateOs } from '~/constants/deployment-template-os.js'

const router = useRouter()

const rows = ref([])
const loading = ref(true)
const error = ref('')
const personalFilter = ref('all')

const personalFilterOptions = [
  { value: 'all', label: 'Все доступные' },
  { value: 'no', label: 'Только общие' },
  { value: 'yes', label: 'Только личные' },
]

function osLabel(v) {
  return labelDeploymentTemplateOs(v)
}

function formatUtc(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' Z')
}

function goNew() {
  void router.push('/templates/new')
}

function setPersonalFilter(v) {
  if (personalFilter.value === v) return
  personalFilter.value = v
  void load()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/ote/templates', {
      credentials: 'include',
      query: { personal: personalFilter.value },
    })
    rows.value = Array.isArray(res?.templates) ? res.templates : []
  } catch (e) {
    error.value = e?.data?.message || e?.message || String(e)
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})

useHead({ title: 'Шаблоны · OTE Manager' })
</script>
