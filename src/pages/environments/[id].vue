<template>
  <div v-if="env">
    <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="truncate text-[22px] font-extrabold text-slate-900">{{ env.name }}</h1>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
          <span class="inline-flex items-center gap-2">
            <span
              class="size-2 rounded-full"
              :class="
                env.status === 'running'
                  ? 'bg-emerald-500'
                  : env.status === 'deleting'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
              "
            />
            <span>{{ statusTitle(env.status) }}</span>
          </span>
          <span class="text-slate-400">•</span>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
            @click="toast.show('Смена ветки/пресета: скоро', 'info')"
          >
            <Clock class="size-3" />
            {{ env.product }} / {{ env.type }}
            <ChevronDown class="size-3 opacity-70" />
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-2.5">
        <AppButton v-if="env.status !== 'deleting'" variant="warn" size="md" @click="toggle">
          <Square v-if="env.status === 'running'" class="size-3.5" />
          <Play v-else class="size-3.5" />
          {{ env.status === 'running' ? 'Остановить' : 'Запустить' }}
        </AppButton>

        <AppButton variant="danger" size="md" @click="remove">
          <Trash2 class="size-3.5" />
          Удалить
        </AppButton>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">Общая информация</h2>
        <div class="space-y-2.5">
          <div v-for="row in infoRows" :key="row.label" class="flex gap-2">
            <div class="min-w-[120px] text-sm font-semibold text-slate-500">{{ row.label }}:</div>
            <div class="text-sm font-extrabold text-slate-900">{{ row.value }}</div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">Инстансы</h2>
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="py-2 pr-3">Имя</th>
              <th class="py-2 pr-3">Статус</th>
              <th class="py-2 pr-3">Срез</th>
              <th class="py-2 pr-3">Идентификатор</th>
              <th class="py-2">Пересоздание</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="(env.instancesDetail || []).length === 0">
              <td colspan="5" class="py-8 text-sm font-semibold text-slate-500">Инстансы появятся после деплоя</td>
            </tr>
            <tr v-for="(ins, idx) in env.instancesDetail" :key="idx" class="border-b border-slate-200 last:border-b-0">
              <td class="py-3 pr-3 text-sm font-semibold">{{ ins.name }}</td>
              <td class="py-3 pr-3">
                <span
                  v-if="ins.statusTag === 'pending_delete'"
                  class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900"
                >
                  <span class="size-1.5 rounded-full bg-amber-500" />
                  К удалению
                </span>
                <span v-else class="text-sm text-slate-600">—</span>
              </td>
              <td class="py-3 pr-3">
                <button type="button" class="text-sm font-bold text-brand hover:underline" @click.prevent>
                  {{ ins.disksLabel }}
                </button>
              </td>
              <td class="py-3 pr-3 font-mono text-xs text-slate-700">{{ ins.instanceId }}</td>
              <td class="py-3">
                <AppButton size="sm" class="!px-3.5 !py-1.5 !text-xs" @click="toast.show('Пересоздание: скоро', 'success')">
                  Создать
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">Последняя сборка</h2>
        <div v-if="env.lastBuild" class="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 class="size-[18px] shrink-0 text-emerald-600" />
          <div class="min-w-0 flex-1 text-sm font-semibold text-slate-900">
            <strong>{{ env.lastBuild.label }}</strong>
            <span class="text-slate-500"> • Build #{{ env.lastBuild.id }}</span>
          </div>
          <AppButton variant="secondary" size="sm" class="!text-xs" @click="toast.show('Ссылка на CI: скоро', 'info')">
            Открыть сборку
          </AppButton>
        </div>
        <div v-else class="text-sm font-semibold text-slate-500">Сборок пока нет</div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">История действий</h2>
        <div class="divide-y divide-slate-200">
          <div v-for="(h, idx) in env.history" :key="idx" class="flex gap-3 py-2">
            <div class="w-[92px] shrink-0 font-mono text-xs font-semibold text-slate-500">
              {{ formatDateRu(h.at) }}
            </div>
            <div class="text-sm font-semibold text-slate-800">{{ h.text }}</div>
          </div>
        </div>
      </section>
    </div>
  </div>

  <div v-else class="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-card">
    <div class="text-sm font-semibold text-slate-600">Окружение не найдено</div>
    <div class="mt-4">
      <NuxtLink to="/" class="font-bold text-brand hover:underline">Вернуться к списку</NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { ChevronDown, Clock, Play, Square, Trash2, CheckCircle2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { useEnvironmentsStore } from '~/stores/environments'
import { OTE_STATUS, OTE_STATUS_LABELS } from '~/constants/ote'
import { formatDateRu } from '~/utils/date'

const route = useRoute()
const router = useRouter()
const store = useEnvironmentsStore()
const toast = useToast()

const env = computed(() => store.byId(route.params.id))

function statusTitle(status) {
  return OTE_STATUS_LABELS[status] || '—'
}

const infoRows = computed(() => {
  const e = env.value
  if (!e) return []
  return [
    { label: 'Имя', value: e.name },
    { label: 'Тип', value: e.type },
    { label: 'Продукт', value: e.product },
    { label: 'Версия CaseOne', value: e.caseOneVersion },
  ]
})

function toggle() {
  const e = env.value
  if (!e || e.status === OTE_STATUS.DELETING) return
  const running = e.status === OTE_STATUS.RUNNING
  store.setRunning(e.id, !running)
  toast.show(running ? 'Окружение остановлено' : 'Окружение запущено', 'success')
}

function remove() {
  const e = env.value
  if (!e) return
  if (!confirm(`Удалить OTE «${e.name}»?`)) return
  store.remove(e.id)
  toast.show(`OTE «${e.name}» удалена`, 'error')
  router.push('/')
}
</script>
