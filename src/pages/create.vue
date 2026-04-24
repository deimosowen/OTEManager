<template>
  <div>
    <div class="mb-4 max-w-[min(1320px,calc(100vw-2rem))]">
      <h1 class="text-[22px] font-extrabold tracking-tight text-slate-900">Создание новой OTE</h1>
      <p class="mt-1.5 text-sm font-semibold leading-snug text-slate-500">
        Выберите конфигурацию сборки TeamCity, заполните параметры и запустите создание окружения.
      </p>
    </div>

    <div
      v-if="tcBanner"
      class="mb-5 max-w-[720px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
    >
      {{ tcBanner }}
      <NuxtLink to="/profile" class="ml-1 underline decoration-amber-700/40 underline-offset-2 hover:text-amber-950">
        Профиль → интеграции
      </NuxtLink>
    </div>

    <div
      v-if="presetsLoadError"
      class="mb-5 max-w-[720px] rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
    >
      {{ presetsLoadError }}
    </div>

    <div
      v-else-if="!presets.length"
      class="max-w-[720px] rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-card"
    >
      Загрузка пресетов…
    </div>

    <div
      v-else
      class="flex w-full max-w-[min(1320px,calc(100vw-2rem))] flex-col gap-8 xl:flex-row xl:items-start xl:gap-10"
    >
      <div class="min-w-0 flex-1 xl:max-w-[min(720px,100%)]">
        <div class="rounded-2xl border border-slate-200/90 bg-white shadow-card ring-1 ring-slate-900/5">
      <div class="px-5 pt-5 sm:px-6 sm:pt-6">
        <OteTypePicker
          v-model="selectedPresetId"
          heading="Конфигурация сборки TeamCity"
          :types="pickerTypes"
        />
      </div>

      <template v-if="currentPreset">
        <div class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 px-5 pt-3 sm:px-6">
          <p class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Параметры</p>
          <a
            :href="currentPreset.buildConfigUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-brand transition hover:bg-brand/5 hover:underline"
          >
            <ExternalLink class="size-3.5 shrink-0" aria-hidden="true" />
            Сборка в TeamCity
          </a>
        </div>

        <div class="space-y-4 px-5 pb-4 pt-2 sm:px-6 sm:pb-5">
          <div class="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 shadow-inner sm:p-4">
            <OteCreationPresetFieldList
              compact
              :fields="primaryFormFields"
              :form-props="formProps"
              :templates="templates"
              :template-field-options="templateFieldOptions"
              :template-edit-href="templateEditHref"
              v-model:deployment-template-id="selectedDeploymentTemplateId"
            />
          </div>

          <div
            v-if="advancedFormFields.length"
            class="overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 shadow-sm"
          >
            <button
              type="button"
              class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:px-4"
              :aria-expanded="advancedOpen ? 'true' : 'false'"
              aria-controls="ote-create-advanced-fields"
              @click="advancedOpen = !advancedOpen"
            >
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm"
              >
                <ChevronDown
                  class="size-4 transition-transform duration-200"
                  :class="advancedOpen ? 'rotate-180' : ''"
                  aria-hidden="true"
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-extrabold text-slate-900">Редко меняемые параметры</span>
                <span class="mt-0.5 line-clamp-2 block text-xs font-semibold leading-snug text-slate-500">
                  Папка продукта, пути, ветка CaseOne, MSSQL и RabbitMQ — по необходимости.
                </span>
              </span>
              <span
                class="hidden shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:inline"
              >
                {{ advancedFormFields.length }}
              </span>
            </button>
            <div
              v-show="advancedOpen"
              id="ote-create-advanced-fields"
              class="border-t border-slate-200 bg-white px-3 pb-3 pt-1 sm:px-4 sm:pb-3.5"
            >
              <OteCreationPresetFieldList
                compact
                :fields="advancedFormFields"
                :form-props="formProps"
                :templates="templates"
                :template-field-options="templateFieldOptions"
                :template-edit-href="templateEditHref"
                v-model:deployment-template-id="selectedDeploymentTemplateId"
              />
            </div>
          </div>
        </div>
      </template>

      <div
        class="mt-0 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-gradient-to-b from-slate-50/90 to-slate-50/40 px-5 py-3.5 sm:px-6"
      >
        <NuxtLink
          to="/"
          class="inline-flex min-h-[40px] min-w-[100px] items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Отмена
        </NuxtLink>
        <AppButton class="min-h-[40px] min-w-[140px]" :loading="submitting" :disabled="!currentPreset" @click="submitCreate">
          Создать OTE
        </AppButton>
      </div>

      <section
        v-if="creation"
        ref="creationPanelRef"
        class="mt-5 scroll-mt-28 border-t border-slate-200 px-5 pb-5 pt-5 sm:px-6 sm:pb-6"
        tabindex="-1"
      >
      <h2 class="text-base font-extrabold text-slate-900">Запрос #{{ creation.id }}</h2>
      <p class="mt-1 text-sm font-semibold text-slate-600">
        Статус:
        <span :class="oteTcCreationStatusClass(creation.status)">{{ oteTcCreationStatusLabel(creation.status) }}</span>
      </p>
      <p v-if="creation.lastError" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
        {{ creation.lastError }}
      </p>
      <div v-if="creation.teamcityWebUrl" class="mt-4">
        <a
          :href="creation.teamcityWebUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
        >
          <ExternalLink class="size-4" aria-hidden="true" />
          Открыть сборку в TeamCity
        </a>
      </div>
      <dl v-if="creation.status === 'succeeded'" class="mt-6 space-y-3 text-sm">
        <div v-if="creation.metadataTag">
          <dt class="font-bold text-slate-700">metadata.tag</dt>
          <dd class="mt-0.5 font-mono text-xs text-slate-600">{{ creation.metadataTag }}</dd>
        </div>
        <div v-if="creation.caseoneVersion">
          <dt class="font-bold text-slate-700">caseone.version</dt>
          <dd class="mt-0.5 font-mono text-xs text-slate-600">{{ creation.caseoneVersion }}</dd>
        </div>
        <div v-if="creation.caseoneUrl">
          <dt class="font-bold text-slate-700">CaseOne</dt>
          <dd class="mt-0.5">
            <a :href="creation.caseoneUrl" class="break-all font-semibold text-brand hover:underline" target="_blank" rel="noopener">{{ creation.caseoneUrl }}</a>
          </dd>
        </div>
        <div v-if="creation.saasAppUrl">
          <dt class="font-bold text-slate-700">SaaS приложение</dt>
          <dd class="mt-0.5">
            <a :href="creation.saasAppUrl" class="break-all font-semibold text-brand hover:underline" target="_blank" rel="noopener">{{ creation.saasAppUrl }}</a>
          </dd>
        </div>
        <div v-if="creation.rabbitUrl">
          <dt class="font-bold text-slate-700">RabbitMQ</dt>
          <dd class="mt-0.5">
            <span class="break-all font-mono text-xs text-slate-600">{{ creation.rabbitUrl }}</span>
          </dd>
        </div>
        <div v-if="creation.deploymentResultJson">
          <dt class="font-bold text-slate-700">deployment_result.json</dt>
          <dd class="mt-0.5 max-h-40 overflow-auto rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-700">{{ creation.deploymentResultJson }}</dd>
        </div>
      </dl>
      </section>
        </div>
      </div>

      <aside
        class="w-full shrink-0 xl:sticky xl:top-6 xl:w-[min(520px,36vw)] xl:min-w-[360px] xl:self-start"
        aria-labelledby="ote-saved-configs-heading"
      >
        <div
          class="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card ring-1 ring-slate-900/5 xl:max-h-[calc(100vh-5rem)]"
        >
          <div
            class="shrink-0 border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-brand/[0.06] px-4 pb-4 pt-4"
          >
            <div class="flex gap-3">
              <div
                class="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-brand shadow-sm"
              >
                <Layers class="size-5" stroke-width="2" aria-hidden="true" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <h2 id="ote-saved-configs-heading" class="text-[15px] font-extrabold leading-tight tracking-tight text-slate-900">
                    Мои конфигурации
                  </h2>
                  <span
                    v-if="savedConfigsLoaded && savedConfigs.length"
                    class="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-slate-600"
                  >
                    {{ savedConfigs.length }}
                  </span>
                </div>
                <p class="mt-1.5 text-xs font-semibold leading-relaxed text-slate-600">
                  Ваши снимки формы: пресет TeamCity, поля и шаблон из каталога. Системные пресеты приложения не меняются.
                </p>
                <button
                  type="button"
                  class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand px-3 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  :disabled="!currentPreset || saveDialogSaving"
                  @click="openSaveConfigDialog"
                >
                  <BookmarkPlus class="size-4 shrink-0 opacity-95" stroke-width="2" aria-hidden="true" />
                  Сохранить текущую форму
                </button>
              </div>
            </div>

            <div v-if="savedConfigsLoaded && savedConfigs.length" class="relative mt-4">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                stroke-width="2"
                aria-hidden="true"
              />
              <input
                v-model="savedConfigSearch"
                type="search"
                class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-900 shadow-inner placeholder:font-medium placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="Поиск: название, пресет, шаблон, значения полей…"
                autocomplete="off"
              />
              <p
                v-if="savedConfigSearch.trim()"
                class="mt-2 text-[11px] font-bold text-slate-500"
              >
                Показано {{ filteredSavedConfigs.length }} из {{ savedConfigs.length }}
              </p>
            </div>
          </div>

          <p v-if="savedConfigsLoadError" class="shrink-0 px-4 py-3 text-xs font-semibold text-rose-700">{{ savedConfigsLoadError }}</p>
          <div
            v-else-if="!savedConfigsLoaded"
            class="flex shrink-0 items-center gap-2 px-4 py-6 text-sm font-semibold text-slate-500"
          >
            <span class="inline-block size-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" aria-hidden="true" />
            Загружаем список…
          </div>
          <div v-else class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-2 xl:px-4">
            <ul v-if="savedConfigs.length" class="space-y-3">
              <li v-if="savedConfigs.length && !filteredSavedConfigs.length" class="py-6 text-center text-sm font-semibold text-slate-500">
                Ничего не найдено — сбросьте поиск или измените запрос.
              </li>
              <li
                v-for="c in filteredSavedConfigs"
                :key="c.id"
                class="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-0 shadow-sm ring-1 ring-slate-900/5 transition hover:border-brand/25 hover:shadow-md"
              >
                <div
                  class="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand via-sky-500 to-emerald-500 opacity-90"
                  aria-hidden="true"
                />
                <div class="relative pl-4 pr-3 pb-3 pt-3.5 sm:pr-4">
                  <div class="flex min-w-0 items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-[15px] font-extrabold tracking-tight text-slate-900" :title="c.name">
                        {{ c.name }}
                      </p>
                      <p class="mt-1 text-xs font-bold leading-snug text-slate-700">
                        {{ savedConfigPresetLabel(c.basePresetId) }}
                      </p>
                      <p
                        v-if="savedConfigPresetSubtitle(c.basePresetId)"
                        class="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug text-slate-500"
                      >
                        {{ savedConfigPresetSubtitle(c.basePresetId) }}
                      </p>
                    </div>
                  </div>

                  <div class="mt-2.5 flex flex-wrap gap-1.5">
                    <span
                      v-if="savedConfigTemplateMeta(c)"
                      class="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-extrabold text-violet-900"
                      :title="savedConfigTemplateMeta(c).name"
                    >
                      <FileStack class="size-3 shrink-0 opacity-80" stroke-width="2" aria-hidden="true" />
                      <span class="truncate">{{ savedConfigTemplateMeta(c).name }}</span>
                      <PersonalTemplateBadge v-if="savedConfigTemplateMeta(c).isPersonal" compact class="shrink-0" />
                    </span>
                    <span
                      class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-600"
                      :title="formatSavedConfigWhenFull(c.updatedAt)"
                    >
                      <Clock class="size-3 shrink-0 opacity-70" stroke-width="2" aria-hidden="true" />
                      {{ formatSavedConfigWhenShort(c.updatedAt) }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-slate-600"
                      :title="'Число непустых полей пресета в сохранении'"
                    >
                      <ListChecks class="size-3 shrink-0 opacity-70" stroke-width="2" aria-hidden="true" />
                      {{ savedConfigFilledFieldCount(c) }} полей
                    </span>
                  </div>

                  <ul v-if="savedConfigPreviewRows(c).length" class="mt-2.5 space-y-1 rounded-xl border border-slate-100 bg-slate-50/90 px-2.5 py-2">
                    <li
                      v-for="row in savedConfigPreviewRows(c)"
                      :key="row.key"
                      class="flex min-w-0 gap-2 text-[11px] leading-snug"
                    >
                      <span class="shrink-0 font-extrabold text-slate-500">{{ row.label }}</span>
                      <span class="min-w-0 truncate font-mono font-semibold text-slate-800" :title="row.full">{{ row.short }}</span>
                    </li>
                  </ul>

                  <div class="mt-3 flex flex-wrap gap-2">
                    <AppButton size="sm" class="min-w-0 flex-1" @click="applySavedConfig(c)">
                      <Sparkles class="size-3.5 shrink-0 opacity-90" stroke-width="2" aria-hidden="true" />
                      Подставить
                    </AppButton>
                    <AppButton
                      size="sm"
                      variant="danger"
                      class="min-w-0 flex-1"
                      :disabled="deleteSavedLoading"
                      @click="requestDeleteSavedConfig(c)"
                    >
                      <Trash2 class="size-3.5 shrink-0" stroke-width="2" aria-hidden="true" />
                      Удалить
                    </AppButton>
                  </div>
                </div>
              </li>
            </ul>
            <div
              v-else
              class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center"
            >
              <div
                class="flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm"
              >
                <Sparkles class="size-6" stroke-width="1.75" aria-hidden="true" />
              </div>
              <div>
                <p class="text-sm font-extrabold text-slate-800">Пока пусто</p>
                <p class="mt-1 max-w-[260px] text-xs font-semibold leading-relaxed text-slate-500">
                  Заполните форму слева и нажмите «Сохранить текущую форму» — конфигурация появится здесь с кратким превью полей.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <OteSavedConfigDeleteModal
      v-model="deleteSavedModalOpen"
      :config-name="deleteSavedTarget?.name || ''"
      :confirm-loading="deleteSavedLoading"
      @confirm="confirmDeleteSavedConfig"
    />

    <Teleport to="body">
      <div
        v-if="saveDialogOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ote-save-config-title"
      >
        <div class="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" aria-hidden="true" @click="closeSaveConfigDialog" />
        <div
          class="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-slate-900/5"
          @click.stop
        >
          <div class="h-1 bg-gradient-to-r from-brand via-sky-500 to-emerald-400" aria-hidden="true" />
          <div class="p-6 sm:p-7">
            <div class="flex gap-4">
              <div
                class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/10 to-sky-50 text-brand shadow-inner"
              >
                <Bookmark class="size-6" stroke-width="2" aria-hidden="true" />
              </div>
              <div class="min-w-0 flex-1 pt-0.5">
                <h2 id="ote-save-config-title" class="text-lg font-extrabold tracking-tight text-slate-900">Сохранить конфигурацию</h2>
                <p class="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                  Будут сохранены выбранный пресет, поля формы и выбранный шаблон из каталога (если используется).
                </p>
                <label class="mt-4 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Название</label>
                <input
                  v-model="saveDialogName"
                  type="text"
                  maxlength="256"
                  class="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                  placeholder="Например, staging Tantor"
                  autocomplete="off"
                  @keydown.enter.prevent="confirmSaveConfig"
                />
              </div>
            </div>
            <div class="mt-7 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
              <AppButton variant="secondary" :disabled="saveDialogSaving" @click="closeSaveConfigDialog">Отмена</AppButton>
              <AppButton :loading="saveDialogSaving" @click="confirmSaveConfig">Сохранить</AppButton>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  Clock,
  ExternalLink,
  FileStack,
  Layers,
  ListChecks,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'
import { presetIdToTemplateOsFilter } from '~/constants/ote-creation-presets.js'
import { oteTcCreationStatusClass, oteTcCreationStatusLabel } from '~/utils/ote-tc-creation-status.js'

const toast = useToast()

const presets = ref([])
/** @type {import('vue').Ref<{ id: number, name: string, isPersonal?: boolean }[]>} */
const templates = ref([])
const presetsLoadError = ref('')
const tcReady = ref(true)
const tcTokenSaved = ref(false)

const selectedPresetId = ref('astra-linux')
/** Выбранный шаблон из каталога (id строкой для AppSelect); YAML подставляет сервер. */
const selectedDeploymentTemplateId = ref('')
/** @type {import('vue').Ref<Record<string, string>>} */
const formProps = ref({})

/** @type {import('vue').Ref<null | Record<string, unknown>>} */
const creation = ref(null)
const pollTimer = ref(null)
const submitting = ref(false)
/** Свёрнутый блок «редко меняемые» — по умолчанию закрыт. */
const advancedOpen = ref(false)

/** Не запускать watch при программной смене пресета (применение «моей конфигурации»). */
const suppressPresetWatch = ref(false)

/** @type {import('vue').Ref<{ id: number, name: string, basePresetId: string, deploymentTemplateId: number | null, properties: Record<string, string>, createdAt: number, updatedAt: number }[]>} */
const savedConfigs = ref([])
const savedConfigsLoaded = ref(false)
const savedConfigsLoadError = ref('')
const saveDialogOpen = ref(false)
const saveDialogName = ref('')
const saveDialogSaving = ref(false)
const deleteSavedModalOpen = ref(false)
/** @type {import('vue').Ref<null | { id: number, name: string, basePresetId: string, deploymentTemplateId: number | null, properties: Record<string, string>, createdAt: number, updatedAt: number }>} */
const deleteSavedTarget = ref(null)
const deleteSavedLoading = ref(false)
const creationPanelRef = ref(null)
const savedConfigSearch = ref('')
/** Имена всех шаблонов каталога по id (для подписей в списке сохранений). */
const allTemplateNamesById = ref(/** @type {Record<number, string>} */ ({}))
/** Личный шаблон по id (для меток в сохранённых конфигурациях). */
const allTemplatePersonalById = ref(/** @type {Record<number, boolean>} */ ({}))

const pickerTypes = computed(() =>
  presets.value.map((p) => ({
    id: p.id,
    name: p.label,
    subtitle: p.subtitle,
  })),
)

const currentPreset = computed(() => presets.value.find((p) => p.id === selectedPresetId.value) || null)

const filteredSavedConfigs = computed(() => {
  const list = savedConfigs.value
  const q = savedConfigSearch.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((c) => {
    if (String(c.name || '').toLowerCase().includes(q)) return true
    if (savedConfigPresetLabel(c.basePresetId).toLowerCase().includes(q)) return true
    const sub = String(savedConfigPresetSubtitle(c.basePresetId) || '').toLowerCase()
    if (sub.includes(q)) return true
    const tid = c.deploymentTemplateId
    if (tid != null && tid > 0) {
      const tn = String(allTemplateNamesById.value[tid] || '').toLowerCase()
      if (tn.includes(q)) return true
      if (String(tid).includes(q)) return true
      if (allTemplatePersonalById.value[tid] && (q.includes('личн') || q.includes('personal'))) return true
    }
    for (const v of Object.values(c.properties || {})) {
      if (String(v).toLowerCase().includes(q)) return true
    }
    return false
  })
})

const primaryFormFields = computed(() => {
  const p = currentPreset.value
  if (!p?.fields?.length) return []
  return p.fields.filter((f) => !f.advanced)
})

const advancedFormFields = computed(() => {
  const p = currentPreset.value
  if (!p?.fields?.length) return []
  return p.fields.filter((f) => Boolean(f.advanced))
})

const templateCatalogHint = computed(() => {
  if (!currentPreset.value) return ''
  const os = presetIdToTemplateOsFilter(selectedPresetId.value)
  const osLabel = os === 'windows' ? 'Windows' : 'Linux'
  return `В списке шаблонов — записи с типом «Все» или «${osLabel}» (под текущую конфигурацию сборки). Личные шаблоны помечены в списке и видны только вам.`
})

const templateFieldOptions = computed(() =>
  templates.value.map((t) => ({
    value: String(t.id),
    label: String(t.name || '').trim() || `Шаблон №${t.id}`,
    isPersonal: Boolean(t.isPersonal),
  })),
)

const templateEditHref = computed(() => {
  const id = String(selectedDeploymentTemplateId.value || '').trim()
  if (!/^\d+$/.test(id)) return ''
  const t = templates.value.find((x) => String(x.id) === id)
  return t ? `/templates/${t.id}` : ''
})

function savedConfigPresetLabel(presetId) {
  const p = presets.value.find((x) => x.id === presetId)
  return p ? p.label : presetId
}

function savedConfigPresetSubtitle(presetId) {
  const p = presets.value.find((x) => x.id === presetId)
  return p?.subtitle ? String(p.subtitle) : ''
}

/**
 * @param {{ deploymentTemplateId?: number | null }} c
 * @returns {{ name: string, isPersonal: boolean } | null}
 */
function savedConfigTemplateMeta(c) {
  const tid = c.deploymentTemplateId
  if (tid == null || tid <= 0) return null
  const id = Number(tid)
  const name = String(allTemplateNamesById.value[id] || '').trim() || `Шаблон №${id}`
  const isPersonal = Boolean(allTemplatePersonalById.value[id])
  return { name, isPersonal }
}

function formatSavedConfigWhenShort(ts) {
  const n = Number(ts)
  if (!Number.isFinite(n) || n <= 0) return '—'
  const diff = Date.now() - n
  if (diff < 60_000) return 'только что'
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} мин назад`
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))} ч назад`
  if (diff < 7 * 86_400_000) return `${Math.max(1, Math.floor(diff / 86_400_000))} дн назад`
  const d = new Date(n)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

function formatSavedConfigWhenFull(ts) {
  const n = Number(ts)
  if (!Number.isFinite(n) || n <= 0) return ''
  return new Date(n).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function savedConfigFilledFieldCount(c) {
  const preset = presets.value.find((p) => p.id === c.basePresetId)
  if (!preset?.fields?.length) return 0
  let n = 0
  for (const f of preset.fields) {
    const raw = c.properties[f.name]
    const v = typeof raw === 'string' ? raw.trim() : ''
    if (v) n += 1
  }
  return n
}

/**
 * До четырёх непустых «основных» полей для превью в карточке.
 * @param {{ basePresetId: string, properties: Record<string, string> }} c
 */
function savedConfigPreviewRows(c) {
  const preset = presets.value.find((p) => p.id === c.basePresetId)
  if (!preset?.fields?.length) return []
  const primaries = preset.fields.filter((f) => f.type !== 'template_select' && !f.advanced)
  const ordered = [...primaries].sort((a, b) => {
    if (a.name === 'metadata.tag') return -1
    if (b.name === 'metadata.tag') return 1
    return 0
  })
  /** @type {{ key: string, label: string, short: string, full: string }[]} */
  const rows = []
  for (const f of ordered) {
    const raw = c.properties[f.name]
    const v = typeof raw === 'string' ? raw.trim() : ''
    if (!v) continue
    const full = v
    const short = v.length > 56 ? `${v.slice(0, 56)}…` : v
    rows.push({ key: f.name, label: f.label, short, full })
    if (rows.length >= 4) break
  }
  return rows
}

async function loadAllTemplateNamesForSidebar() {
  try {
    const res = await $fetch('/api/ote/templates', { credentials: 'include' })
    const raw = Array.isArray(res?.templates) ? res.templates : []
    /** @type {Record<number, string>} */
    const m = {}
    /** @type {Record<number, boolean>} */
    const p = {}
    for (const t of raw) {
      const id = Number(t.id)
      if (!Number.isFinite(id) || id < 1) continue
      const nm = String(t.name || '').trim()
      m[id] = nm || `Шаблон №${id}`
      p[id] = Boolean(t.isPersonal)
    }
    allTemplateNamesById.value = m
    allTemplatePersonalById.value = p
  } catch {
    allTemplateNamesById.value = {}
    allTemplatePersonalById.value = {}
  }
}

function openSaveConfigDialog() {
  saveDialogName.value = ''
  saveDialogOpen.value = true
}

function closeSaveConfigDialog() {
  if (saveDialogSaving.value) return
  saveDialogOpen.value = false
}

async function loadSavedConfigs() {
  savedConfigsLoadError.value = ''
  try {
    const res = await $fetch('/api/ote/create/saved-configs', { credentials: 'include' })
    savedConfigs.value = Array.isArray(res?.configs) ? res.configs : []
  } catch (e) {
    savedConfigsLoadError.value =
      e?.data?.message || e?.message || 'Не удалось загрузить сохранённые конфигурации'
    savedConfigs.value = []
  } finally {
    savedConfigsLoaded.value = true
  }
}

async function confirmSaveConfig() {
  const p = currentPreset.value
  if (!p) return
  const name = String(saveDialogName.value || '').trim().slice(0, 256)
  if (!name) {
    toast.show('Введите название', 'error')
    return
  }
  saveDialogSaving.value = true
  try {
    let deploymentTemplateId = null
    if (templates.value.length && selectedDeploymentTemplateId.value && /^\d+$/.test(selectedDeploymentTemplateId.value)) {
      deploymentTemplateId = Number(selectedDeploymentTemplateId.value)
    }
    const properties = { ...formProps.value }
    const res = await $fetch('/api/ote/create/saved-configs', {
      method: 'POST',
      credentials: 'include',
      body: { name, basePresetId: p.id, deploymentTemplateId, properties },
    })
    const cfg = res?.config
    if (!cfg?.id) {
      toast.show('Сервер не вернул конфигурацию', 'error')
      return
    }
    savedConfigs.value = [cfg, ...savedConfigs.value.filter((x) => x.id !== cfg.id)]
    const tid = cfg.deploymentTemplateId
    if (tid != null && tid > 0) {
      const fromList = templates.value.find((x) => x.id === tid)
      if (fromList) {
        allTemplateNamesById.value = {
          ...allTemplateNamesById.value,
          [tid]: String(fromList.name || '').trim() || `Шаблон №${tid}`,
        }
        allTemplatePersonalById.value = {
          ...allTemplatePersonalById.value,
          [tid]: Boolean(fromList.isPersonal),
        }
      } else {
        void loadAllTemplateNamesForSidebar()
      }
    }
    saveDialogOpen.value = false
    toast.show('Конфигурация сохранена', 'success')
  } catch (e) {
    const msg = e?.data?.message || e?.message || String(e)
    toast.show(msg, 'error')
  } finally {
    saveDialogSaving.value = false
  }
}

async function applySavedConfig(cfg) {
  if (!cfg?.basePresetId) return
  if (!presets.value.some((p) => p.id === cfg.basePresetId)) {
    toast.show('Пресет из сохранённой конфигурации недоступен', 'error')
    return
  }
  suppressPresetWatch.value = true
  try {
    selectedPresetId.value = cfg.basePresetId
    await refreshTemplatesForCreate()
    const tid = cfg.deploymentTemplateId
    if (tid != null && tid > 0) {
      const idStr = String(tid)
      const ids = templates.value.map((t) => String(t.id))
      if (ids.includes(idStr)) selectedDeploymentTemplateId.value = idStr
      else if (ids.length) selectedDeploymentTemplateId.value = ids[0]
      else selectedDeploymentTemplateId.value = ''
    } else {
      selectedDeploymentTemplateId.value = ''
    }
    rebuildFormPreservingCommon(cfg.basePresetId)
    const p = presets.value.find((x) => x.id === cfg.basePresetId)
    const rawProps = cfg.properties && typeof cfg.properties === 'object' ? cfg.properties : {}
    if (p) {
      const merged = { ...formProps.value }
      for (const f of p.fields) {
        if (Object.prototype.hasOwnProperty.call(rawProps, f.name)) {
          merged[f.name] = String(rawProps[f.name] ?? '')
        }
      }
      formProps.value = merged
      const tf = p.fields.find((x) => x.type === 'template_select')
      if (tf && tid != null && tid > 0 && templates.value.some((t) => String(t.id) === String(tid))) {
        const fp = { ...formProps.value }
        delete fp[tf.name]
        formProps.value = fp
      }
    }
    toast.show('Конфигурация применена', 'success')
  } finally {
    suppressPresetWatch.value = false
  }
}

function requestDeleteSavedConfig(cfg) {
  if (!cfg?.id) return
  deleteSavedTarget.value = cfg
  deleteSavedModalOpen.value = true
}

async function confirmDeleteSavedConfig() {
  const cfg = deleteSavedTarget.value
  if (!cfg?.id) return
  deleteSavedLoading.value = true
  try {
    await $fetch(`/api/ote/create/saved-configs/${cfg.id}`, { method: 'DELETE', credentials: 'include' })
    savedConfigs.value = savedConfigs.value.filter((x) => x.id !== cfg.id)
    deleteSavedModalOpen.value = false
    deleteSavedTarget.value = null
    toast.show('Удалено', 'success')
  } catch (e) {
    const msg = e?.data?.message || e?.message || String(e)
    toast.show(msg, 'error')
  } finally {
    deleteSavedLoading.value = false
  }
}

watch(deleteSavedModalOpen, (open) => {
  if (!open && !deleteSavedLoading.value) {
    deleteSavedTarget.value = null
  }
})

const tcBanner = computed(() => {
  if (tcReady.value) return ''
  if (tcTokenSaved.value) {
    return 'Токен TeamCity сохранён, но сервер не может авторизоваться в TeamCity. Проверьте токен или серверные настройки.'
  }
  return 'Для запуска сборок нужен токен TeamCity в профиле.'
})

function rebuildFormPreservingCommon(newPresetId) {
  const p = presets.value.find((x) => x.id === newPresetId)
  if (!p) return
  const prevProps = { ...formProps.value }
  const next = {}
  for (const f of p.fields) {
    if (f.type === 'template_select') {
      if (templates.value.length) {
        const ids = templates.value.map((t) => String(t.id))
        const kept = selectedDeploymentTemplateId.value
        selectedDeploymentTemplateId.value = ids.includes(kept) ? kept : ids[0]
      } else {
        next[f.name] = typeof prevProps[f.name] === 'string' ? prevProps[f.name] : ''
      }
      continue
    }
    if (f.type === 'select' && Array.isArray(f.options) && f.options.length) {
      const kept = prevProps[f.name]
      if (f.options.some((o) => String(o.value) === String(kept))) {
        next[f.name] = String(kept)
      } else if (
        f.defaultValue != null &&
        f.options.some((o) => String(o.value) === String(f.defaultValue))
      ) {
        next[f.name] = String(f.defaultValue)
      } else {
        next[f.name] = String(f.options[0].value)
      }
    } else {
      const prev = prevProps[f.name]
      const hasPrev = typeof prev === 'string' && prev.length > 0
      if (hasPrev) {
        next[f.name] = prev
      } else if (f.defaultValue != null && String(f.defaultValue).length > 0) {
        next[f.name] = String(f.defaultValue)
      } else {
        next[f.name] = ''
      }
    }
  }
  formProps.value = next
}

async function refreshTemplatesForCreate() {
  try {
    const os = presetIdToTemplateOsFilter(selectedPresetId.value)
    const tplRes = await $fetch('/api/ote/templates', {
      credentials: 'include',
      query: { forOs: os },
    }).catch(() => ({ templates: [] }))
    const raw = Array.isArray(tplRes?.templates) ? tplRes.templates : []
    templates.value = raw.map((t) => ({
      id: t.id,
      name: String(t.name || ''),
      isPersonal: Boolean(t.isPersonal),
    }))
  } catch {
    templates.value = []
  }
}

watch(selectedPresetId, async (n) => {
  if (suppressPresetWatch.value) return
  advancedOpen.value = false
  if (!presets.value.length || !n) return
  await refreshTemplatesForCreate()
  rebuildFormPreservingCommon(n)
})

watch(
  () => templates.value.length,
  () => {
    if (suppressPresetWatch.value) return
    if (!presets.value.length || !selectedPresetId.value) return
    rebuildFormPreservingCommon(selectedPresetId.value)
  },
)

function clearPoll() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

async function refreshCreation() {
  const id = creation.value?.id
  if (id == null) return
  try {
    const res = await $fetch(`/api/ote/create/requests/${id}`, { credentials: 'include' })
    creation.value = res?.creation || null
    const st = creation.value?.status
    if (st === 'succeeded' || st === 'failed') {
      clearPoll()
    }
  } catch (e) {
    const msg = e?.data?.message || e?.message || String(e)
    toast.show(msg, 'error')
    clearPoll()
  }
}

function startPoll() {
  clearPoll()
  pollTimer.value = setInterval(() => {
    void refreshCreation()
  }, 3000)
}

onBeforeUnmount(() => {
  clearPoll()
})

onMounted(async () => {
  try {
    const tc = await $fetch('/api/me/tc-credentials', { credentials: 'include' })
    tcReady.value = Boolean(tc?.teamcity?.ready)
    tcTokenSaved.value = Boolean(tc?.teamcity?.tokenSaved)
  } catch {
    tcReady.value = false
  }
  try {
    const presRes = await $fetch('/api/ote/create/presets', { credentials: 'include' })
    presets.value = Array.isArray(presRes?.presets) ? presRes.presets : []
  } catch (e) {
    presetsLoadError.value = e?.data?.message || e?.message || 'Не удалось загрузить пресеты'
    return
  }
  if (!presets.value.length) return
  if (!presets.value.some((p) => p.id === selectedPresetId.value)) {
    selectedPresetId.value = presets.value[0].id
  }
  await refreshTemplatesForCreate()
  rebuildFormPreservingCommon(selectedPresetId.value)
  void loadSavedConfigs()
  void loadAllTemplateNamesForSidebar()
})

async function submitCreate() {
  const p = currentPreset.value
  if (!p) return
  submitting.value = true
  try {
    const properties = { ...formProps.value }
    /** @type {{ presetId: string, properties: Record<string, string>, deploymentTemplateId?: number }} */
    const body = {
      presetId: p.id,
      properties,
    }
    if (templates.value.length && selectedDeploymentTemplateId.value) {
      body.deploymentTemplateId = Number(selectedDeploymentTemplateId.value)
      delete body.properties.default_deploymet_config_template
    }
    const res = await $fetch('/api/ote/create/teamcity', {
      method: 'POST',
      credentials: 'include',
      body,
    })
    const c = res?.creation
    if (!c?.id) {
      toast.show('Сервер не вернул идентификатор запроса', 'error')
      return
    }
    creation.value = c
    toast.show('Сборка поставлена в TeamCity', 'success')
    void refreshCreation()
    startPoll()
    await nextTick()
    const el = creationPanelRef.value
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el?.focus({ preventScroll: true })
  } catch (e) {
    const msg = e?.data?.message || e?.message || String(e)
    toast.show(msg, 'error')
  } finally {
    submitting.value = false
  }
}

</script>
