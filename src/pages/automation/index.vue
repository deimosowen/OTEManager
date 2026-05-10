<template>
  <div>
    <OteDeleteConfirmModal
      v-model="deleteModalOpen"
      variant="seed"
      :ote-label="pendingDeleteName"
      :label-mono="false"
      dialog-title="Удалить сценарий?"
      hint-override="Граф сценария и все шаги будут удалены без возможности восстановления."
      :confirm-loading="deleteBusy"
      @confirm="confirmDeleteScenario"
    />

    <div
      data-tour="tour-automation-header"
      class="mb-5 flex flex-wrap items-center justify-between gap-3"
    >
      <h1 class="text-[22px] font-extrabold text-slate-900">Автоматизации</h1>
      <AppButton type="button" :loading="creating" :disabled="loading" @click="openCreateModal">Новый сценарий</AppButton>
    </div>

    <p data-tour="tour-automation-about" class="mb-4 max-w-3xl text-sm font-semibold text-slate-600">
      Сценарии автоматизируют действия по расписанию, событиям или по кнопке.
    </p>

    <div v-if="error" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
      {{ error }}
    </div>

    <div
      v-if="loading"
      data-tour="tour-automation-table"
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
      aria-busy="true"
    >
      <div class="h-12 animate-pulse bg-slate-50/90" />
      <div class="space-y-2 p-4">
        <div class="h-10 animate-pulse rounded-lg bg-slate-100" />
        <div class="h-10 animate-pulse rounded-lg bg-slate-100" />
        <div class="h-10 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>

    <AutomationScenariosTable
      v-else
      data-tour="tour-automation-table"
      :scenarios="scenarios"
      @open="openScenario"
      @edit-meta="openEditMeta"
      @toggle-enabled="onToggleEnabled"
      @delete="onDeleteScenario"
    />

    <AutomationScenarioMetaModal
      v-model="metaModalOpen"
      :mode="metaMode"
      :initial="metaInitial"
      @submit="onMetaSubmit"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppButton from '~/components/ui/AppButton.vue'
import OteDeleteConfirmModal from '~/components/domain/OteDeleteConfirmModal.vue'
import AutomationScenarioMetaModal from '~/components/automation/AutomationScenarioMetaModal.vue'
import AutomationScenariosTable from '~/components/automation/AutomationScenariosTable.vue'
import { useAutomationScenariosList } from '~/composables/useAutomationScenariosList.js'
import { loadManualLaunchPanelFromApi } from '~/composables/useManualHomeLaunch.js'

const router = useRouter()
const toast = useToast()
const { scenarios, load, addScenario, patchScenario, deleteScenario, loading, error } = useAutomationScenariosList()

const creating = ref(false)
const metaModalOpen = ref(false)
/** @type {'create' | 'edit'} */
const metaMode = ref('create')
const metaInitial = ref(null)
const editingScenarioId = ref(/** @type {number | null} */ (null))

const deleteModalOpen = ref(false)
/** @type {import('vue').Ref<{ id: number; name: string } | null>} */
const pendingDelete = ref(null)
const deleteBusy = ref(false)

const pendingDeleteName = computed(() => (pendingDelete.value ? String(pendingDelete.value.name || '') : ''))

watch(deleteModalOpen, (open) => {
  if (!open && !deleteBusy.value) pendingDelete.value = null
})

function openScenario(id) {
  if (id == null || id === '') return
  void router.push(`/automation/${encodeURIComponent(String(id))}`)
}

function openCreateModal() {
  metaMode.value = 'create'
  metaInitial.value = null
  editingScenarioId.value = null
  metaModalOpen.value = true
}

function openEditMeta(s) {
  metaMode.value = 'edit'
  editingScenarioId.value = s.id
  metaInitial.value = {
    name: s.name,
    status: s.status,
    enabled: s.enabled !== false,
  }
  metaModalOpen.value = true
}

async function onMetaSubmit(payload) {
  if (creating.value) return
  creating.value = true
  try {
    if (metaMode.value === 'create') {
      const id = await addScenario(payload)
      metaModalOpen.value = false
      await router.push(`/automation/${encodeURIComponent(id)}`)
    } else if (editingScenarioId.value != null) {
      await patchScenario(editingScenarioId.value, payload)
      await loadManualLaunchPanelFromApi($fetch)
      metaModalOpen.value = false
      toast.show('Параметры сохранены', 'success')
    }
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  } finally {
    creating.value = false
  }
}

async function onToggleEnabled(s) {
  try {
    await patchScenario(s.id, { enabled: s.enabled === false })
    await loadManualLaunchPanelFromApi($fetch)
    toast.show(s.enabled === false ? 'Сценарий включён' : 'Сценарий отключён', 'success')
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  }
}

function onDeleteScenario(s) {
  if (!s?.id) return
  pendingDelete.value = { id: s.id, name: String(s.name || '') }
  deleteModalOpen.value = true
}

async function confirmDeleteScenario() {
  const row = pendingDelete.value
  if (!row?.id || deleteBusy.value) return
  deleteBusy.value = true
  try {
    await deleteScenario(row.id)
    await loadManualLaunchPanelFromApi($fetch)
    toast.show('Сценарий удалён', 'success')
    deleteModalOpen.value = false
    pendingDelete.value = null
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  } finally {
    deleteBusy.value = false
  }
}

onMounted(() => {
  void load()
})

useHead({ title: 'Автоматизации · OTE Manager' })
</script>
