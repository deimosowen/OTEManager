<template>
  <div class="pb-10">
    <div class="mb-5">
      <h1 class="text-[22px] font-extrabold tracking-tight text-slate-900">Пользователи и группы</h1>
      <p class="mt-0.5 text-sm font-medium text-slate-500">Роли, группы и каталог входов.</p>
      <div class="mt-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-inner">
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-xs font-extrabold transition sm:px-4 sm:text-sm"
          :class="tab === 'people' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
          @click="tab = 'people'"
        >
          Пользователи
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-xs font-extrabold transition sm:px-4 sm:text-sm"
          :class="tab === 'groups' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
          @click="tab = 'groups'"
        >
          Группы
        </button>
      </div>
    </div>

    <div v-if="loadError" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
      {{ loadError }}
    </div>

    <div v-else-if="loading" class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-card">
      Загрузка…
    </div>

    <template v-else>
      <!-- Пользователи -->
      <div v-show="tab === 'people'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="u in users"
          :key="u.userKey"
          type="button"
          class="group flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition hover:border-brand/35 hover:shadow-md"
          @click="openUserPanel(u)"
        >
          <div class="flex gap-3">
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-extrabold text-slate-700"
            >
              {{ initialsFor(u) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-extrabold text-slate-900">{{ u.displayName || u.login || '—' }}</p>
              <p class="truncate font-mono text-xs text-slate-500">{{ u.email || '—' }}</p>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <span
              class="inline-flex max-w-full items-center truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700"
              :title="u.group?.name"
            >
              {{ u.group?.name || '—' }}
            </span>
            <span
              v-for="code in (u.roleCodes || []).filter((c) => c !== ROLE_CODES.USER)"
              :key="code"
              class="rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand"
            >
              {{ code }}
            </span>
          </div>
          <p class="mt-3 border-t border-slate-100 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Последний вход · {{ formatShort(u.lastSeenAt) }}
          </p>
        </button>
      </div>

      <!-- Группы: одна компактная карточка -->
      <div v-show="tab === 'groups'" class="max-w-3xl">
        <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div class="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
            <span class="shrink-0 text-xs font-extrabold text-slate-500">Новая</span>
            <input
              v-model="newGroupName"
              type="text"
              maxlength="256"
              placeholder="Название группы"
              class="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none ring-brand/25 placeholder:text-slate-400 focus:border-brand focus:ring-2"
              @keydown.enter.prevent="createGroup"
            />
            <AppButton size="sm" variant="primary" class="shrink-0" :loading="creatingGroup" :disabled="!newGroupName.trim()" @click="createGroup">
              Добавить
            </AppButton>
          </div>
          <ul class="divide-y divide-slate-100">
            <li
              v-for="g in groups"
              :key="g.id"
              class="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <template v-if="editingGroupId === g.id && !g.isSystem">
                    <input
                      v-model="editGroupName"
                      type="text"
                      maxlength="256"
                      class="min-h-8 max-w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-bold text-slate-900 outline-none ring-brand/25 focus:ring-2"
                      @keydown.enter.prevent="saveGroupRename(g.id)"
                    />
                  </template>
                  <p v-else class="truncate text-sm font-extrabold text-slate-900">{{ g.name }}</p>
                  <span
                    v-if="g.isSystem"
                    class="shrink-0 rounded border border-amber-200/80 bg-amber-50 px-1.5 py-0 text-[10px] font-extrabold uppercase tracking-wide text-amber-800"
                  >
                    Системная
                  </span>
                  <span class="text-[11px] font-semibold text-slate-400">{{ membersCount(g.id) }} чел.</span>
                </div>
                <p class="truncate font-mono text-[10px] leading-tight text-slate-400">{{ g.code }}</p>
              </div>
              <div v-if="!g.isSystem" class="flex shrink-0 flex-wrap gap-1.5">
                <template v-if="editingGroupId === g.id">
                  <AppButton size="sm" variant="secondary" class="!text-xs !px-2 !py-1" :disabled="renamingGroup" @click="cancelEditGroup">Отмена</AppButton>
                  <AppButton size="sm" variant="primary" class="!text-xs !px-2 !py-1" :loading="renamingGroup" @click="saveGroupRename(g.id)">Сохранить</AppButton>
                </template>
                <template v-else>
                  <AppButton size="sm" variant="secondary" class="!text-xs !px-2 !py-1" @click="startEditGroup(g)">Переименовать</AppButton>
                  <AppButton size="sm" variant="danger" class="!text-xs !px-2 !py-1" @click="askDeleteGroup(g)">Удалить</AppButton>
                </template>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <!-- Карточка пользователя -->
    <Teleport to="body">
      <div
        v-if="panelUser"
        class="fixed inset-0 z-[220] flex justify-end"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-panel-title"
      >
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" aria-hidden="true" @click="closePanel" />
        <div
          class="relative flex h-full max-h-[100dvh] w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
          @click.stop
        >
          <div class="h-1 shrink-0 bg-gradient-to-r from-brand via-violet-500 to-sky-500" aria-hidden="true" />
          <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div class="flex min-w-0 gap-3">
              <div
                class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-base font-extrabold text-slate-700"
              >
                {{ initialsFor(panelUser) }}
              </div>
              <div class="min-w-0">
                <h2 id="admin-user-panel-title" class="truncate text-lg font-extrabold tracking-tight text-slate-900">
                  {{ panelUser.displayName || panelUser.login || 'Пользователь' }}
                </h2>
                <p class="truncate font-mono text-xs text-slate-500">{{ panelUser.email }}</p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Закрыть"
              @click="closePanel"
            >
              <span class="sr-only">Закрыть</span>
              <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <div class="min-w-0">
              <AppStyledSelect
                v-model="panelGroupId"
                label="Группа"
                :options="groupSelectOptions"
                placeholder="Выберите группу"
                no-options-message="Нет групп в каталоге"
              />
            </div>

            <div>
              <p class="text-xs font-extrabold uppercase tracking-wide text-slate-500">Роли</p>
              <div class="mt-3 space-y-2">
                <label
                  v-for="role in roleDefinitions"
                  :key="'p-' + role.code"
                  class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:border-slate-300"
                  :class="role.code === ROLE_CODES.USER ? 'cursor-default opacity-90' : ''"
                >
                  <input
                    v-model="panelRoles[role.code]"
                    type="checkbox"
                    :disabled="role.code === ROLE_CODES.USER"
                    class="size-4 rounded border-slate-300 text-brand focus:ring-brand disabled:cursor-not-allowed"
                  />
                  <span class="text-sm font-bold text-slate-800">{{ role.label }}</span>
                  <span class="ml-auto font-mono text-[10px] text-slate-400">{{ role.code }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <AppButton variant="secondary" :disabled="savingPanel" @click="closePanel">Закрыть</AppButton>
            <AppButton variant="primary" :loading="savingPanel" :disabled="!panelDirty" @click="savePanel"> Сохранить </AppButton>
          </div>
        </div>
      </div>
    </Teleport>

    <OteDeleteConfirmModal
      v-model="deleteGroupOpen"
      dialog-title="Удалить группу?"
      hint-override="Пользователи этой группы будут переведены в системную группу «Общая»."
      :ote-label="deleteGroupTarget?.name || ''"
      :confirm-loading="deletingGroup"
      @confirm="confirmDeleteGroup"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { $fetch } from 'ofetch'
import { ROLE_CODES } from '~/constants/rbac'
import { useUserTimeFormat } from '~/composables/useUserTimeFormat'
import OteDeleteConfirmModal from '~/components/domain/OteDeleteConfirmModal.vue'
import AppStyledSelect from '~/components/ui/AppStyledSelect.vue'

definePageMeta({
  middleware: ['admin-only'],
})

const { formatDateTimeSeconds } = useUserTimeFormat()
const toast = useToast()
const route = useRoute()

const tab = ref(/** @type {'people' | 'groups'} */ ('people'))

function applyGroupsTabFromRoute() {
  const q = route.query.tab
  const raw = Array.isArray(q) ? q[0] : q
  if (raw === 'groups') tab.value = 'groups'
  else if (raw === 'people') tab.value = 'people'
}

watch(
  () => route.query.tab,
  () => {
    applyGroupsTabFromRoute()
  },
  { immediate: true },
)
const loading = ref(true)
const loadError = ref('')
const users = ref(/** @type {any[]} */ ([]))
const groups = ref(/** @type {any[]} */ ([]))
const roleDefinitions = ref(/** @type {{ code: string, label: string }[]} */ ([]))

const panelUserKey = ref('')
const panelRoles = reactive(/** @type {Record<string, boolean>} */ ({}))
const panelGroupId = ref(/** @type {number | null} */ (null))
const savingPanel = ref(false)

const newGroupName = ref('')
const creatingGroup = ref(false)
const editingGroupId = ref(/** @type {number | null} */ (null))
const editGroupName = ref('')
const renamingGroup = ref(false)

const deleteGroupOpen = ref(false)
const deleteGroupTarget = ref(/** @type {any | null} */ (null))
const deletingGroup = ref(false)

const panelUser = computed(() => users.value.find((x) => x.userKey === panelUserKey.value) ?? null)

const groupSelectOptions = computed(() =>
  (groups.value || []).map((g) => ({
    value: Number(g.id),
    label: g.isSystem ? `${String(g.name || '')} (Системная)` : String(g.name || ''),
  })),
)

const membersByGroupId = computed(() => {
  const m = /** @type {Record<number, number>} */ ({})
  for (const u of users.value) {
    const id = u.group?.id
    if (id != null && Number.isFinite(Number(id))) {
      const k = Number(id)
      m[k] = (m[k] || 0) + 1
    }
  }
  return m
})

function membersCount(groupId) {
  return membersByGroupId.value[groupId] ?? 0
}

function initialsFor(u) {
  const n = String(u?.displayName || u?.login || u?.email || '?').trim()
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase() || '?'
}

function formatShort(iso) {
  if (!iso) return '—'
  try {
    return formatDateTimeSeconds(iso)
  } catch {
    return String(iso)
  }
}

function codesFromPanel() {
  return Object.keys(panelRoles).filter((code) => panelRoles[code])
}

const panelDirty = computed(() => {
  const u = panelUser.value
  if (!u) return false
  const a = [...(u.roleCodes || [])].sort().join(',')
  const b = codesFromPanel()
      .sort()
      .join(',')
  const gCur = u.group?.id != null ? Number(u.group.id) : null
  const gNew = panelGroupId.value != null ? Number(panelGroupId.value) : null
  return a !== b || gCur !== gNew
})

function openUserPanel(u) {
  panelUserKey.value = u.userKey
  for (const r of roleDefinitions.value) {
    panelRoles[r.code] = (u.roleCodes || []).includes(r.code)
  }
  if (!panelRoles[ROLE_CODES.USER]) panelRoles[ROLE_CODES.USER] = true
  panelGroupId.value = u.group?.id != null ? Number(u.group.id) : null
}

function closePanel() {
  panelUserKey.value = ''
}

async function savePanel() {
  const u = panelUser.value
  if (!u) return
  savingPanel.value = true
  try {
    let codes = codesFromPanel()
    if (!codes.includes(ROLE_CODES.USER)) codes = [...codes, ROLE_CODES.USER]
    await $fetch('/api/admin/users', {
      method: 'PATCH',
      body: {
        userKey: u.userKey,
        roleCodes: codes,
        groupId: panelGroupId.value,
      },
      credentials: 'include',
    })
    toast.show('Сохранено', 'success')
    await load()
    const updated = users.value.find((x) => x.userKey === u.userKey)
    if (updated) openUserPanel(updated)
    else closePanel()
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  } finally {
    savingPanel.value = false
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch('/api/admin/users', { credentials: 'include' })
    users.value = Array.isArray(res?.users) ? res.users : []
    groups.value = Array.isArray(res?.groups) ? res.groups : []
    roleDefinitions.value = Array.isArray(res?.roles) ? res.roles : []
  } catch (e) {
    loadError.value = e?.data?.message || e?.message || String(e)
    users.value = []
    groups.value = []
  } finally {
    loading.value = false
  }
}

async function createGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  creatingGroup.value = true
  try {
    await $fetch('/api/admin/groups', {
      method: 'POST',
      body: { name },
      credentials: 'include',
    })
    newGroupName.value = ''
    toast.show('Группа создана', 'success')
    await load()
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  } finally {
    creatingGroup.value = false
  }
}

function startEditGroup(g) {
  editingGroupId.value = g.id
  editGroupName.value = g.name
}

function cancelEditGroup() {
  editingGroupId.value = null
  editGroupName.value = ''
}

async function saveGroupRename(id) {
  const name = editGroupName.value.trim()
  if (!name) return
  renamingGroup.value = true
  try {
    await $fetch(`/api/admin/groups/${id}`, {
      method: 'PATCH',
      body: { name },
      credentials: 'include',
    })
    toast.show('Группа переименована', 'success')
    editingGroupId.value = null
    await load()
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  } finally {
    renamingGroup.value = false
  }
}

function askDeleteGroup(g) {
  deleteGroupTarget.value = g
  deleteGroupOpen.value = true
}

async function confirmDeleteGroup() {
  const g = deleteGroupTarget.value
  if (!g) return
  deletingGroup.value = true
  try {
    await $fetch(`/api/admin/groups/${g.id}`, { method: 'DELETE', credentials: 'include' })
    toast.show('Группа удалена', 'success')
    deleteGroupOpen.value = false
    deleteGroupTarget.value = null
    await load()
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  } finally {
    deletingGroup.value = false
  }
}

onMounted(() => {
  void load()
})

useHead({ title: 'Пользователи · OTE Manager' })
</script>
