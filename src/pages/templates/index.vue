<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-[22px] font-extrabold text-slate-900">Шаблоны деплоя</h1>
      <AppButton @click="goNew">Новый шаблон</AppButton>
    </div>

    <p class="mb-4 max-w-3xl text-sm font-semibold text-slate-600">
      YAML-конфигурации для создания OTE через TeamCity. При запуске сборки в параметр
      <span class="font-mono text-xs">default_deploymet_config_template</span>
      подставляется <strong>текст YAML</strong> выбранного шаблона.
    </p>

    <div v-if="error" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
      {{ error }}
    </div>

    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div class="overflow-x-auto">
        <table class="min-w-[800px] w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3">Название</th>
              <th class="px-4 py-3">Изменён (UTC)</th>
              <th class="px-4 py-3">Автор изменения</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="px-4 py-10 text-center font-semibold text-slate-500">Загрузка…</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="4" class="px-4 py-10 text-center font-semibold text-slate-500">
                Шаблонов пока нет.
                <NuxtLink to="/templates/new" class="font-bold text-brand hover:underline">Создать первый</NuxtLink>
              </td>
            </tr>
            <tr v-for="r in rows" :key="r.id" class="border-b border-slate-100 last:border-b-0">
              <td class="px-4 py-2.5">
                <NuxtLink :to="`/templates/${r.id}`" class="font-bold text-brand hover:underline">{{ r.name }}</NuxtLink>
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
import { onMounted, ref } from 'vue'

const router = useRouter()

const rows = ref([])
const loading = ref(true)
const error = ref('')

function formatUtc(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' Z')
}

function goNew() {
  void router.push('/templates/new')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/ote/templates', { credentials: 'include' })
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
