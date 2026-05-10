<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <h1 class="text-[22px] font-extrabold text-slate-900">{{ pageTitle }}</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <AppButton
          v-if="scenario && loadError === ''"
          type="button"
          variant="secondary"
          size="sm"
          @click="openScenarioMeta"
        >
          Параметры сценария
        </AppButton>
        <NuxtLink
          to="/automation"
          class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
        >
          К списку
        </NuxtLink>
      </div>
    </div>

    <div
      v-if="loadError === 'notfound'"
      class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"
    >
      <p>Сценарий не найден или недоступен для вашей группы.</p>
      <p class="mt-2">
        <NuxtLink to="/automation" class="font-bold text-brand hover:underline">Вернуться к списку автоматизаций</NuxtLink>
      </p>
    </div>

    <div
      v-else-if="loadError === 'error'"
      class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
    >
      {{ loadErrorMessage }}
    </div>

    <div
      v-else-if="pending"
      class="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
      aria-busy="true"
      aria-label="Загрузка сценария"
    >
      <div class="h-14 border-b border-slate-100 bg-slate-50/80" />
      <div class="flex flex-1 gap-4 p-4">
        <div class="hidden w-[300px] shrink-0 flex-col gap-3 lg:flex">
          <div class="h-10 animate-pulse rounded-xl bg-slate-100" />
          <div class="h-24 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div class="min-h-[420px] flex-1 animate-pulse rounded-xl bg-gradient-to-br from-slate-100 to-slate-50" />
      </div>
    </div>

    <ClientOnly v-else-if="scenario">
      <AutomationWorkflowBuilder
        :key="scenario.id"
        :scenario-id="String(scenario.id)"
        :initial-graph="scenario.graph"
      />
      <template #fallback>
        <div
          class="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
          aria-busy="true"
          aria-label="Загрузка редактора сценариев"
        >
          <div class="h-14 border-b border-slate-100 bg-slate-50/80" />
          <div class="flex flex-1 gap-4 p-4">
            <div class="hidden w-[300px] shrink-0 flex-col gap-3 lg:flex">
              <div class="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div class="h-24 animate-pulse rounded-xl bg-slate-100" />
              <div class="h-24 animate-pulse rounded-xl bg-slate-100" />
              <div class="h-24 animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div class="min-h-[420px] flex-1 animate-pulse rounded-xl bg-gradient-to-br from-slate-100 to-slate-50" />
          </div>
        </div>
      </template>
    </ClientOnly>

    <AutomationScenarioMetaModal
      v-model="scenarioMetaOpen"
      mode="edit"
      :initial="scenarioMetaInitial"
      @submit="onScenarioMetaSubmit"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AppButton from '~/components/ui/AppButton.vue'
import AutomationScenarioMetaModal from '~/components/automation/AutomationScenarioMetaModal.vue'
import AutomationWorkflowBuilder from '~/components/automation/AutomationWorkflowBuilder.vue'
import { loadManualLaunchPanelFromApi } from '~/composables/useManualHomeLaunch.js'

const route = useRoute()
const toast = useToast()
const idParam = computed(() => String(route.params.id || ''))

const scenario = ref(null)
const pending = ref(true)
const loadError = ref('')
const loadErrorMessage = ref('')

const scenarioMetaOpen = ref(false)
const scenarioMetaInitial = ref(null)

function openScenarioMeta() {
  if (!scenario.value) return
  scenarioMetaInitial.value = {
    name: scenario.value.name,
    status: scenario.value.status,
    enabled: scenario.value.enabled !== false,
  }
  scenarioMetaOpen.value = true
}

async function onScenarioMetaSubmit(payload) {
  const id = Number(scenario.value?.id)
  if (!Number.isFinite(id) || id < 1) return
  try {
    const res = await $fetch(`/api/ote/automation-scenarios/${id}`, {
      method: 'PUT',
      credentials: 'include',
      body: payload,
    })
    const s = res?.scenario
    if (s) {
      scenario.value = { ...scenario.value, name: s.name, status: s.status, enabled: s.enabled !== false }
    }
    await loadManualLaunchPanelFromApi($fetch)
    scenarioMetaOpen.value = false
    toast.show('Параметры сохранены', 'success')
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  }
}

async function loadScenario() {
  pending.value = true
  loadError.value = ''
  loadErrorMessage.value = ''
  scenario.value = null

  const id = Number(idParam.value)
  if (!Number.isFinite(id) || id < 1) {
    loadError.value = 'notfound'
    pending.value = false
    return
  }

  try {
    const res = await $fetch(`/api/ote/automation-scenarios/${id}`, { credentials: 'include' })
    scenario.value = res?.scenario || null
    if (!scenario.value) {
      loadError.value = 'notfound'
    }
  } catch (e) {
    scenario.value = null
    if (e?.statusCode === 404) {
      loadError.value = 'notfound'
    } else {
      loadError.value = 'error'
      loadErrorMessage.value = e?.data?.message || e?.message || String(e)
    }
  } finally {
    pending.value = false
  }
}

watch(
  () => idParam.value,
  () => {
    void loadScenario()
  },
  { immediate: true },
)

const pageTitle = computed(() => scenario.value?.name || 'Редактор сценария')

useHead(() => ({
  title:
    loadError.value === 'notfound'
      ? 'Сценарий не найден · OTE Manager'
      : `${pageTitle.value} · Автоматизации`,
}))
</script>
