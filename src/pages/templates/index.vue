<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-[22px] font-extrabold text-slate-900">Шаблоны сборок</h1>
      <AppButton @click="goNew">Новый шаблон</AppButton>
    </div>

    <p class="mb-4 max-w-3xl text-sm font-semibold text-slate-600">
      Редактор YAML + конфигурация TeamCity (build) + параметры для подстановок и запуска создания OTE.
    </p>

    <div v-if="error" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
      {{ error }}
    </div>

    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div class="overflow-x-auto">
        <table class="min-w-[800px] w-full max-w-none table-fixed border-collapse text-sm">
          <colgroup>
            <col class="w-[20%]" />
            <col class="w-[42%]" />
            <col class="w-[15%]" />
            <col class="w-[11%]" />
            <col class="w-[12%]" />
          </colgroup>
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="min-w-[8rem] px-3 py-3">Название</th>
              <th class="min-w-0 px-3 py-3">TeamCity</th>
              <th class="min-w-[13.5rem] whitespace-nowrap px-2 py-3">Доступ</th>
              <th class="min-w-[9.5rem] whitespace-nowrap px-3 py-3">Изменён</th>
              <th class="min-w-[7.5rem] px-3 py-3">Автор изменения</th>
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
              <td class="max-w-0 px-3 py-2.5 align-top">
                <NuxtLink :to="`/templates/${r.id}`" class="block min-w-0 font-bold text-brand hover:underline">
                  <span class="break-words">{{ r.name }}</span>
                </NuxtLink>
              </td>
              <td class="min-w-0 px-3 py-2.5 font-mono text-xs text-slate-700">
                <div class="flex min-w-0 items-baseline gap-2">
                  <a
                    v-if="r.teamcityBuildConfigUrl"
                    :href="r.teamcityBuildConfigUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="shrink-0 font-bold text-brand hover:underline"
                  >
                    build
                  </a>
                  <span v-else class="shrink-0 font-bold text-slate-400">—</span>
                  <span class="text-slate-300">·</span>
                  <span
                    class="min-w-0 truncate font-mono"
                    :title="r.teamcityBuildTypeId || ''"
                  >{{ r.teamcityBuildTypeId || '—' }}</span>
                </div>
              </td>
              <td class="overflow-visible whitespace-nowrap px-2 py-2.5 align-middle">
                <TemplatesSharedAccessBadge :row="r" />
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-800">
                {{ formatDateTimeSeconds(r.updatedAt) }}
              </td>
              <td class="max-w-0 truncate px-3 py-2.5 text-slate-700" :title="r.updatedByEmail || ''">
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
import { useUserTimeFormat } from '~/composables/useUserTimeFormat'

const router = useRouter()
const { formatDateTimeSeconds } = useUserTimeFormat()

const rows = ref([])
const loading = ref(true)
const error = ref('')

function goNew() {
  void router.push('/templates/new')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/ote/build-templates', {
      credentials: 'include',
      query: { browse: '1' },
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
