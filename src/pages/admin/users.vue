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
      <div v-show="tab === 'people'" class="space-y-4">
        <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-inner sm:flex-row sm:flex-wrap sm:items-end">
          <div class="min-w-[min(100%,260px)] flex-1 sm:max-w-md">
            <AppInput
              v-model="userSearch"
              native-type="search"
              label="Поиск"
              autocomplete="off"
              placeholder="Имя, логин или email"
            />
          </div>
          <div class="w-full sm:w-56">
            <AppSelect v-model="filterGroupIdRaw" label="Группа" :options="groupFilterSelectOptions" />
          </div>
          <p class="text-xs font-semibold text-slate-500 sm:ml-auto sm:self-end sm:pb-2">
            <span class="font-extrabold text-slate-800">{{ filteredUsers.length }}</span>
            из
            {{ users.length }}
          </p>
        </div>

        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div class="overflow-x-auto">
            <table class="min-w-[880px] w-full max-w-none table-fixed border-collapse text-sm">
              <colgroup>
                <col class="w-[24%]" />
                <col class="w-[28%]" />
                <col class="w-[17%]" />
                <col class="w-[19%]" />
                <col class="w-[12%]" />
              </colgroup>
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th class="px-3 py-3">Пользователь</th>
                  <th class="px-3 py-3">Email</th>
                  <th class="min-w-[8rem] px-3 py-3">Группа</th>
                  <th class="min-w-[7rem] px-3 py-3">Роли</th>
                  <th class="whitespace-nowrap px-3 py-3">Последний вход</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="!filteredUsers.length">
                  <tr>
                    <td colspan="5" class="px-4 py-10 text-center font-semibold text-slate-500">
                      <template v-if="!users.length">В каталоге пока нет ни одного пользователя.</template>
                      <template v-else>
                        Никого не найдено.
                        <span v-if="userSearch.trim() || filterGroupIdRaw" class="mt-2 block text-xs font-semibold text-slate-400">
                          Смените поиск или фильтр группы.
                        </span>
                      </template>
                    </td>
                  </tr>
                </template>
                <template v-else>
                  <tr
                    v-for="u in filteredUsers"
                    :key="u.userKey"
                    class="cursor-pointer border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/90"
                    @click="openUserPanel(u)"
                  >
                    <td class="px-3 py-2.5 align-top">
                      <div class="flex min-w-0 gap-2.5">
                        <div
                          class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-extrabold text-slate-700"
                        >
                          {{ initialsFor(u) }}
                        </div>
                        <div class="min-w-0">
                          <p class="truncate font-extrabold text-slate-900">{{ u.displayName || u.login || '—' }}</p>
                          <p class="truncate font-mono text-[11px] text-slate-500">{{ u.login || '—' }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="max-w-0 truncate px-3 py-2.5 align-top font-mono text-xs text-slate-700" :title="u.email || ''">
                      {{ u.email || '—' }}
                    </td>
                    <td class="max-w-0 truncate px-3 py-2.5 align-top text-xs font-bold text-slate-800" :title="u.group?.name || ''">
                      {{ u.group?.name || '—' }}
                    </td>
                    <td class="min-w-0 px-3 py-2 align-top">
                      <div class="flex flex-wrap gap-1">
                        <template v-if="elevatedRoleCodes(u).length">
                          <span
                            v-for="code in elevatedRoleCodes(u)"
                            :key="code"
                            class="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand"
                          >
                            {{ code }}
                          </span>
                        </template>
                        <span v-else class="text-xs font-semibold text-slate-400">Базовая</span>
                      </div>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2.5 align-top font-mono text-xs text-slate-800">{{ formatShort(u.lastSeenAt) }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Группы -->
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
              <div class="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <p
                  v-if="g.isSystem"
                  class="max-w-[200px] text-right text-[11px] font-semibold leading-snug text-slate-400"
                  title="Новые пользователи уже попадают в системную группу при первом входе"
                >
                  Приглашение не нужно
                </p>
                <template v-if="!g.isSystem">
                  <AppButton
                    size="sm"
                    variant="ghost"
                    class="!gap-1.5 !px-2 !py-1 !text-xs font-bold text-emerald-800 ring-1 ring-emerald-200/90 hover:bg-emerald-50 hover:ring-emerald-300"
                    title="Создать одноразовую или ограниченную ссылку в эту группу"
                    @click="openGroupInviteModal(g)"
                  >
                    <Link2 class="size-3.5 shrink-0 opacity-90" aria-hidden="true" />
                    Пригласить
                  </AppButton>
                </template>
                <div v-if="!g.isSystem" class="flex flex-wrap justify-end gap-1.5">
                  <template v-if="editingGroupId === g.id">
                    <AppButton size="sm" variant="secondary" class="!text-xs !px-2 !py-1" :disabled="renamingGroup" @click="cancelEditGroup">Отмена</AppButton>
                    <AppButton size="sm" variant="primary" class="!text-xs !px-2 !py-1" :loading="renamingGroup" @click="saveGroupRename(g.id)">Сохранить</AppButton>
                  </template>
                  <template v-else>
                    <AppButton size="sm" variant="secondary" class="!text-xs !px-2 !py-1" @click="startEditGroup(g)">Переименовать</AppButton>
                    <AppButton size="sm" variant="danger" class="!text-xs !px-2 !py-1" @click="askDeleteGroup(g)">Удалить</AppButton>
                  </template>
                </div>
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
        class="fixed inset-0 z-drawer flex justify-end"
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

    <!-- Модальное окно приглашения в группу -->
    <Teleport to="body">
      <div
        v-if="inviteModalOpen && inviteModalGroup"
        class="fixed inset-0 z-sheet flex items-end justify-center p-0 sm:items-center sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-invite-modal-title"
      >
        <div class="absolute inset-0 bg-slate-900/55 backdrop-blur-[3px]" aria-hidden="true" @click="closeGroupInviteModal" />
        <div
          class="relative flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:rounded-2xl"
          @click.stop
        >
          <div class="h-1.5 shrink-0 bg-gradient-to-r from-emerald-500 via-brand to-violet-500" aria-hidden="true" />

          <div class="flex items-start gap-4 border-b border-slate-100 px-5 pb-4 pt-5">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-800 shadow-inner shadow-emerald-900/10 ring-1 ring-emerald-200/80"
              aria-hidden="true"
            >
              <Link2 class="size-6" :stroke-width="2.25" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 id="group-invite-modal-title" class="text-lg font-extrabold tracking-tight text-slate-900">Приглашение по ссылке</h2>
              <p class="mt-1 truncate text-sm font-bold text-brand">{{ inviteModalGroup.name }}</p>
            </div>
            <button
              type="button"
              class="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Закрыть"
              @click="closeGroupInviteModal"
            >
              <span class="sr-only">Закрыть</span>
              <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <template v-if="inviteModalStep === 'form'">
              <div class="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Как это работает</p>
                <ul class="space-y-1.5 text-sm font-semibold leading-snug text-slate-600">
                  <li class="flex gap-2">
                    <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                    Человек открывает ссылку без входа; если не авторизован — входит через Яндекс.
                  </li>
                  <li class="flex gap-2">
                    <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                    После первого сохранения в каталог автоматически назначается эта группа.
                  </li>
                  <li class="flex gap-2">
                    <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500/90" aria-hidden="true" />
                    Один «вход по ссылке» при успешной смене группы считается в лимите; если уже в этой группе — расход не тратится.
                  </li>
                </ul>
              </div>

              <div class="mt-5 grid gap-4 sm:grid-cols-2">
                <AppInput
                  :model-value="inviteExpiresDays"
                  native-type="number"
                  label="Действует, дней"
                  label-title="Допустимо от 1 до 365 дней"
                  min="1"
                  max="365"
                  input-class="text-center tabular-nums font-extrabold"
                  @update:model-value="onInviteExpiresDays"
                />
                <AppInput
                  :model-value="inviteMaxUses"
                  native-type="number"
                  label="Лимит активаций"
                  label-title="Сколько раз можно перейти по ссылке (1–5000)"
                  min="1"
                  max="5000"
                  input-class="text-center tabular-nums font-extrabold"
                  @update:model-value="onInviteMaxUses"
                />
              </div>
            </template>

            <template v-else-if="inviteModalStep === 'done' && inviteModalResult?.inviteUrl">
              <div class="rounded-xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/80 to-white px-4 py-4">
                <p class="text-center text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">Готово</p>
                <p class="mt-1 text-center text-sm font-semibold text-slate-700">
                  До
                  <span class="font-extrabold text-slate-900">{{ formatInviteExpires(inviteModalResult.expiresAt) }}</span>
                  · активаций:
                  <span class="font-extrabold text-slate-900">{{ inviteModalResult.maxUses }}</span>
                </p>
                <div class="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                  <input
                    readonly
                    :value="inviteModalResult.inviteUrl"
                    class="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-[11px] font-semibold text-slate-800 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                    @focus="selectInviteUrlField"
                  />
                  <AppButton variant="primary" class="shrink-0 font-extrabold sm:px-5" @click="copyInviteModalUrl">Копировать</AppButton>
                </div>
                <p class="mt-3 text-center text-[11px] font-semibold leading-relaxed text-amber-900/90">
                  Сохраните ссылку: полный токен показывается только здесь.
                </p>
              </div>
            </template>
          </div>

          <div class="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/40 px-5 py-4">
            <AppButton variant="secondary" :disabled="creatingInvite" @click="closeGroupInviteModal">Закрыть</AppButton>
            <AppButton
              v-if="inviteModalStep === 'form'"
              variant="primary"
              class="font-extrabold"
              :loading="creatingInvite"
              @click="createGroupInvite"
            >
              Создать ссылку
            </AppButton>
            <AppButton v-else variant="primary" class="font-extrabold" @click="resetGroupInviteModalForm">Новая ссылка</AppButton>
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
import { Link2 } from 'lucide-vue-next'
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

/** Поиск и фильтр по группе (клиент, список уже загружен целиком) */
const userSearch = ref('')
const filterGroupIdRaw = ref('')

const groupFilterSelectOptions = computed(() => [
  { value: '', label: 'Все группы' },
  ...(groups.value || []).map((g) => ({
    value: String(g.id),
    label: String(g.name || ''),
  })),
])

const filteredUsers = computed(() => {
  let list = users.value.slice()
  const gidRaw = filterGroupIdRaw.value
  if (gidRaw !== '' && gidRaw != null) {
    const gid = Number(gidRaw)
    if (Number.isFinite(gid)) list = list.filter((u) => Number(u.group?.id) === gid)
  }
  const q = userSearch.value.trim().toLowerCase()
  if (q) {
    list = list.filter((u) => {
      const name = String(u.displayName || '').toLowerCase()
      const login = String(u.login || '').toLowerCase()
      const email = String(u.email || '').toLowerCase()
      return name.includes(q) || login.includes(q) || email.includes(q)
    })
  }
  return list
})

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

const inviteModalOpen = ref(false)
const inviteModalGroup = ref(/** @type {any | null} */ (null))
const inviteModalStep = ref(/** @type {'form' | 'done'} */ ('form'))
const inviteExpiresDays = ref(7)
const inviteMaxUses = ref(1)
const creatingInvite = ref(false)
const inviteModalResult = ref(
  /** @type {{ inviteUrl?: string, expiresAt?: string, maxUses?: number, groupId?: number, groupName?: string } | null} */ (null),
)

/** @param {string | number} v */
function onInviteExpiresDays(v) {
  if (v === '' || v == null) {
    inviteExpiresDays.value = 7
    return
  }
  const n = Number(v)
  if (!Number.isFinite(n)) return
  inviteExpiresDays.value = Math.min(365, Math.max(1, Math.floor(n)))
}

/** @param {string | number} v */
function onInviteMaxUses(v) {
  if (v === '' || v == null) {
    inviteMaxUses.value = 1
    return
  }
  const n = Number(v)
  if (!Number.isFinite(n)) return
  inviteMaxUses.value = Math.min(5000, Math.max(1, Math.floor(n)))
}

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

/** Роли для таблицы: без базовой USER */
function elevatedRoleCodes(u) {
  return (u.roleCodes || []).filter((c) => c !== ROLE_CODES.USER)
}

/** @param {FocusEvent & { target: HTMLElement | null }} ev */
function selectInviteUrlField(ev) {
  if (ev?.target instanceof HTMLInputElement) ev.target.select()
}

function formatInviteExpires(iso) {
  if (!iso) return '—'
  try {
    return formatDateTimeSeconds(iso)
  } catch {
    return String(iso)
  }
}

function openGroupInviteModal(g) {
  if (!g || Number(g.isSystem)) return
  inviteModalGroup.value = g
  inviteModalStep.value = 'form'
  inviteModalResult.value = null
  inviteExpiresDays.value = 7
  inviteMaxUses.value = 1
  inviteModalOpen.value = true
}

function closeGroupInviteModal() {
  inviteModalOpen.value = false
  inviteModalGroup.value = null
  inviteModalStep.value = 'form'
  inviteModalResult.value = null
}

function resetGroupInviteModalForm() {
  inviteModalStep.value = 'form'
  inviteModalResult.value = null
}

async function createGroupInvite() {
  const g = inviteModalGroup.value
  const gid = Number(g?.id)
  if (!Number.isFinite(gid) || Number(g?.isSystem)) return
  creatingInvite.value = true
  try {
    const res = await $fetch('/api/admin/group-invites', {
      method: 'POST',
      body: {
        groupId: gid,
        expiresInDays: inviteExpiresDays.value,
        maxUses: inviteMaxUses.value,
      },
      credentials: 'include',
    })
    inviteModalResult.value =
      typeof res?.inviteUrl === 'string'
        ? {
            inviteUrl: res.inviteUrl,
            expiresAt: res.expiresAt,
            maxUses: Number(res.maxUses),
            groupId: Number(res.groupId),
            groupName: String(res.groupName || ''),
          }
        : null
    inviteModalStep.value = 'done'
    toast.show('Ссылка создана', 'success')
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
    inviteModalResult.value = null
  } finally {
    creatingInvite.value = false
  }
}

async function copyInviteModalUrl() {
  const u = inviteModalResult.value?.inviteUrl
  if (!u || typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
    toast.show('Копирование в буфер недоступно в этом браузере', 'warn')
    return
  }
  try {
    await navigator.clipboard.writeText(u)
    toast.show('Ссылка скопирована', 'success')
  } catch {
    toast.show('Не удалось скопировать', 'error')
  }
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
