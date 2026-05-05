<template>
  <div class="mx-auto w-full max-w-4xl min-w-0 px-3 pb-12 pt-2 sm:px-5">
    <header
      class="relative mb-6 min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-brand-light/[0.15] px-5 py-4 shadow-sm ring-1 ring-slate-900/[0.04] sm:px-6 sm:py-5"
    >
      <div class="pointer-events-none absolute -right-12 top-0 size-32 rounded-full bg-brand/[0.07] blur-2xl" aria-hidden="true" />
      <div class="relative flex flex-col gap-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Администрирование</p>
            <h1 class="mt-1.5 text-xl font-extrabold tracking-tight text-slate-900">Настройки системы</h1>
            <p class="mt-2 max-w-2xl text-[13px] font-medium leading-relaxed text-slate-600 sm:text-[14px]">
              Параметры приложения и интеграций. TeamCity и каталог Yandex Cloud задаются <span class="font-semibold text-slate-700">по группам каталога</span>.
            </p>
          </div>
        </div>

        <nav class="flex w-full flex-wrap gap-2 lg:hidden" aria-label="Разделы страницы">
          <button
            v-for="link in settingsNav"
            :key="link.id"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-brand/40 hover:bg-brand-light/40 hover:text-brand"
            :class="link.badge ? 'text-slate-500' : ''"
            @click="scrollTo(link.id)"
          >
            <component :is="link.icon" class="size-3.5 text-slate-400" aria-hidden="true" />
            {{ link.label }}
            <span v-if="link.badge" class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-500">{{
              link.badge
            }}</span>
          </button>
        </nav>
      </div>
    </header>

    <div class="lg:flex lg:items-start lg:gap-8">
      <nav class="mb-4 hidden shrink-0 lg:sticky lg:top-24 lg:block lg:w-56" aria-label="Разделы настроек">
        <p class="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Разделы</p>
        <ul class="space-y-1 rounded-xl border border-slate-200/90 bg-white p-2 shadow-card">
          <li v-for="link in settingsNav" :key="link.id">
            <a
              :href="`#${link.id}`"
              class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-brand/30"
              :class="link.badge ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-800' : 'text-slate-600 hover:bg-brand-light/60 hover:text-brand'"
              @click.prevent="scrollTo(link.id)"
            >
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 shadow-inner ring-1 ring-slate-200/80"
              >
                <component :is="link.icon" class="size-4" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1 leading-tight">
                <span class="flex items-center gap-2">
                  {{ link.label }}
                  <span
                    v-if="link.badge"
                    class="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-500"
                    >{{ link.badge }}</span
                  >
                </span>
                <span v-if="link.hint" class="mt-0.5 block text-[10px] font-semibold leading-snug text-slate-400">{{ link.hint }}</span>
              </span>
            </a>
          </li>
        </ul>
      </nav>

      <div
        class="min-w-0 flex-1 divide-y divide-slate-100 overflow-visible rounded-2xl border border-slate-200/95 bg-white shadow-card"
      >
        <section id="system-general" class="scroll-mt-24 bg-gradient-to-r from-slate-50/[0.65] via-white to-transparent px-5 py-4 sm:px-6">
          <div class="mb-3 flex items-start gap-3">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/90 text-slate-700 shadow-sm ring-1 ring-slate-300/70"
              aria-hidden="true"
            >
              <Settings2 class="size-5" />
            </span>
            <div class="min-w-0 pt-0.5">
              <h2 class="text-[15px] font-extrabold tracking-tight text-slate-900">Общие</h2>
              <p class="mt-0.5 text-xs font-medium text-slate-600">Параметры вне групп каталога.</p>
            </div>
          </div>
          <p class="rounded-lg border border-dashed border-slate-200/90 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-500">
            Пока нет параметров.
          </p>
        </section>

        <section id="system-teamcity" class="scroll-mt-24 bg-gradient-to-r from-sky-50/[0.4] via-white to-transparent px-5 py-5 sm:px-6">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100/90 text-brand shadow-sm ring-1 ring-sky-200/80"
                aria-hidden="true"
              >
                <Network class="size-4" />
              </span>
              <div class="min-w-0">
                <h2 class="text-[15px] font-extrabold tracking-tight text-slate-900">Интеграции по группе</h2>
                <p class="text-xs text-slate-500">
                  Выберите группу, заполните поля и нажмите «Сохранить» — сохраняются и TeamCity, и каталог Yandex для всех строк.
                </p>
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <AppButton variant="secondary" size="sm" class="shadow-sm" :disabled="loading || saving" @click="reload">Обновить</AppButton>
              <AppButton
                variant="primary"
                size="sm"
                class="min-h-[38px] min-w-[7.5rem] shadow-sm"
                :loading="saving"
                :disabled="loading || !dirtyTeamCity"
                @click="saveAll"
              >
                Сохранить
              </AppButton>
            </div>
          </div>
          <p v-if="dirtyTeamCity && !loading" class="mb-3 text-[11px] font-semibold text-amber-800">Есть несохранённые изменения</p>

          <div v-if="loadError" class="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-800">
            {{ loadError }}
          </div>

          <div v-if="loading" class="py-10 text-center text-sm font-semibold text-slate-500">Загрузка…</div>

          <div v-else-if="!loadError" class="space-y-3">
            <div v-if="activeTcRow" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                <AppStyledSelect
                  v-model="selectedTcGroupId"
                  class="min-w-0 flex-1 sm:max-w-lg"
                  label="Группа каталога"
                  placeholder="Выберите группу"
                  :options="tcGroupSelectOptions"
                />
                <AppButton
                  v-if="tcSystemRow && !activeTcRow.group.isSystem"
                  variant="secondary"
                  size="sm"
                  class="shrink-0 self-start sm:self-end"
                  type="button"
                  @click="copyTcUrlsFromSystem"
                >
                  URL как у системной
                </AppButton>
              </div>

              <div class="mt-6 border-t border-slate-100 pt-5">
                <h3 class="mb-3 flex flex-wrap items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
                  <Network class="size-4 shrink-0 text-brand" aria-hidden="true" />
                  TeamCity
                </h3>
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <AppInput
                    v-model="activeTcRow.settings.tcRestBaseUrl"
                    label="REST URL"
                    placeholder="https://…"
                    autocomplete="off"
                    class="url-field"
                  />
                  <AppInput
                    v-model="activeTcRow.settings.tcUiBaseUrl"
                    label="Веб URL"
                    placeholder="https://…"
                    autocomplete="off"
                    class="url-field"
                  />
                </div>

                <div class="mt-4 grid grid-cols-1 gap-3">
                  <AppInput
                    v-model="activeTcRow.settings.startBuildTypeId"
                    label="Запуск (buildTypeId)"
                    placeholder="…_StartByTag"
                    autocomplete="off"
                    class="build-field"
                  />
                  <AppInput
                    v-model="activeTcRow.settings.stopBuildTypeId"
                    label="Остановка (buildTypeId)"
                    placeholder="…_StopByTag"
                    autocomplete="off"
                    class="build-field"
                  />
                  <AppInput
                    v-model="activeTcRow.settings.deleteBuildTypeId"
                    label="Удаление (buildTypeId)"
                    placeholder="…_Delete"
                    autocomplete="off"
                    class="build-field"
                  />
                  <AppInput
                    v-model="activeTcRow.settings.modifyDeleteDateBuildTypeId"
                    label="Изменение даты удаления (buildTypeId)"
                    placeholder="CasePro_UniversalDeploy_ModifyDateDelete"
                    autocomplete="off"
                    class="build-field"
                  />
                </div>
              </div>

              <div id="system-yandex" class="scroll-mt-24 mt-6 border-t border-slate-100 pt-5">
                <h3 class="mb-2 flex flex-wrap items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
                  <Cloud class="size-4 shrink-0 text-amber-700" aria-hidden="true" />
                  Яндекс Cloud
                </h3>
                <p class="mb-3 text-xs leading-relaxed text-slate-600">
                  Каталог в облаке, где у этой группы лежат виртуальные машины. Его идентификатор задаётся вручную — его
                  можно скопировать из консоли Yandex Cloud в разделе с каталогами. Пока поле пустое, участники этой
                  группы не смогут открыть список окружений в приложении.
                </p>
                <AppInput
                  v-model="activeTcRow.settings.ycFolderId"
                  class="folder-field"
                  label="Идентификатор каталога"
                  placeholder="вставьте из консоли Yandex Cloud"
                  autocomplete="off"
                />
              </div>
            </div>

            <p v-else class="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-center text-sm text-slate-500">
              Нет групп каталога.
            </p>

            <p
              v-if="saveMessage"
              class="rounded-lg px-3 py-2 text-xs font-semibold ring-1"
              :class="
                saveError
                  ? 'bg-rose-50 text-rose-800 ring-rose-100'
                  : 'bg-emerald-50 text-emerald-900 ring-emerald-100'
              "
            >
              {{ saveMessage }}
            </p>
          </div>
        </section>

        <section
          class="scroll-mt-24 border-t border-slate-100 bg-gradient-to-r from-amber-50/30 via-white to-transparent px-5 py-4 sm:px-6"
          aria-label="Яндекс"
        >
          <p class="text-xs font-medium text-slate-600">
            <Cloud class="mb-0.5 mr-1 inline size-3.5 align-text-bottom text-amber-700" aria-hidden="true" />
            Настройки Яндекса для группы — в блоке
            <a
              href="#system-teamcity"
              class="font-bold text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
              @click.prevent="scrollTo('system-teamcity')"
              >«Интеграции по группе»</a
            >
            ниже, под TeamCity.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Cloud, Network, Settings2 } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { $fetch } from 'ofetch'

definePageMeta({
  middleware: ['admin-only'],
})

useHead({ title: 'Настройки системы · OTE Manager' })

/** @type {readonly { id: string, label: string, icon: object, hint?: string, badge?: string }[]} */
const settingsNav = [
  { id: 'system-general', label: 'Общие', icon: Settings2, hint: 'Вне групп каталога' },
  { id: 'system-teamcity', label: 'TeamCity', icon: Network, hint: 'TC и каталог YC' },
  { id: 'system-yandex', label: 'Яндекс', icon: Cloud, hint: 'В той же карточке' },
]

function scrollTo(sectionId) {
  if (!import.meta.client || typeof document === 'undefined') return
  const el = document.getElementById(sectionId)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveMessage = ref('')
const saveError = ref(false)

/** @type {import('vue').Ref<{ group: object, settings: Record<string, string> }[]>} */
const draftRows = ref([])
const baselineJson = ref('')

const selectedTcGroupId = ref(null)

const activeTcRow = computed(() => {
  const rows = draftRows.value
  if (!rows.length) return null
  const id = selectedTcGroupId.value
  if (id == null || id === '') return rows[0]
  const match = rows.find((r) => String(r.group.id) === String(id))
  return match || rows[0]
})

const tcSystemRow = computed(() => draftRows.value.find((r) => r.group.isSystem) ?? null)

const tcGroupSelectOptions = computed(() =>
  draftRows.value.map((r) => ({
    value: String(r.group.id),
    label: r.group.isSystem ? `${String(r.group.name || '')} (Системная)` : String(r.group.name || ''),
  })),
)

function ensureTcSelection(rows) {
  if (!rows?.length) {
    selectedTcGroupId.value = null
    return
  }
  if (rows.some((r) => String(r.group.id) === String(selectedTcGroupId.value))) return
  selectedTcGroupId.value = String(rows[0].group.id)
}

function copyTcUrlsFromSystem() {
  const sys = tcSystemRow.value
  const cur = activeTcRow.value
  if (!sys || !cur || cur.group.isSystem) return
  cur.settings.tcRestBaseUrl = sys.settings.tcRestBaseUrl
  cur.settings.tcUiBaseUrl = sys.settings.tcUiBaseUrl
}

function emptySettings() {
  return {
    tcRestBaseUrl: '',
    tcUiBaseUrl: '',
    startBuildTypeId: '',
    stopBuildTypeId: '',
    deleteBuildTypeId: '',
    modifyDeleteDateBuildTypeId: '',
    ycFolderId: '',
  }
}

function cloneFromApi(rows) {
  return (rows || []).map((r) => ({
    group: { ...r.group },
    settings: {
      ...emptySettings(),
      ...(r.settings || {}),
      tcRestBaseUrl: String(r.settings?.tcRestBaseUrl || ''),
      tcUiBaseUrl: String(r.settings?.tcUiBaseUrl || ''),
      startBuildTypeId: String(r.settings?.startBuildTypeId || ''),
      stopBuildTypeId: String(r.settings?.stopBuildTypeId || ''),
      deleteBuildTypeId: String(r.settings?.deleteBuildTypeId || ''),
      modifyDeleteDateBuildTypeId: String(r.settings?.modifyDeleteDateBuildTypeId || ''),
      ycFolderId: String(r.settings?.ycFolderId ?? ''),
    },
  }))
}

const dirtyTeamCity = computed(() => {
  try {
    return JSON.stringify(toPayload(draftRows.value)) !== baselineJson.value
  } catch {
    return true
  }
})

function toPayload(rows) {
  return rows.map((r) => ({
    groupId: r.group.id,
    tcRestBaseUrl: r.settings.tcRestBaseUrl,
    tcUiBaseUrl: r.settings.tcUiBaseUrl,
    startBuildTypeId: r.settings.startBuildTypeId,
    stopBuildTypeId: r.settings.stopBuildTypeId,
    deleteBuildTypeId: r.settings.deleteBuildTypeId,
    modifyDeleteDateBuildTypeId: r.settings.modifyDeleteDateBuildTypeId,
    ycFolderId: r.settings.ycFolderId,
  }))
}

async function reload() {
  loading.value = true
  loadError.value = ''
  saveMessage.value = ''
  try {
    const res = await $fetch('/api/admin/teamcity-group-settings', { credentials: 'include' })
    const rows = cloneFromApi(res?.rows)
    draftRows.value = rows
    ensureTcSelection(rows)
    baselineJson.value = JSON.stringify(toPayload(rows))
  } catch (e) {
    loadError.value = e?.data?.message || e?.message || 'Не удалось загрузить настройки'
  } finally {
    loading.value = false
  }
}

async function saveAll() {
  saving.value = true
  saveMessage.value = ''
  saveError.value = false
  try {
    await $fetch('/api/admin/teamcity-group-settings', {
      method: 'PUT',
      credentials: 'include',
      body: { items: toPayload(draftRows.value) },
    })
    baselineJson.value = JSON.stringify(toPayload(draftRows.value))
    saveMessage.value = 'Сохранено'
  } catch (e) {
    saveError.value = true
    saveMessage.value = e?.data?.message || e?.message || 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}

onMounted(reload)
</script>

<style scoped>
.build-field :deep(input),
.folder-field :deep(input),
.url-field :deep(input) {
  max-width: 100%;
  overflow-x: auto;
}

.build-field :deep(input),
.folder-field :deep(input) {
  min-height: 2.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.8125rem;
}

.url-field :deep(input) {
  font-size: 0.8125rem;
}
</style>
