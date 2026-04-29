<template>
  <div class="max-w-[min(1100px,calc(100vw-2rem))]">
    <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-[22px] font-extrabold tracking-tight text-slate-900">Создание новой OTE</h1>
        <p class="mt-1.5 text-sm font-semibold leading-snug text-slate-500">
          Выберите шаблон сборки, при необходимости переопределите параметры и запустите создание окружения в TeamCity.
        </p>
      </div>
      <div
        class="flex shrink-0 rounded-xl border border-slate-200 bg-slate-50/80 p-1 shadow-inner"
        role="group"
        aria-label="Вид страницы"
      >
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-extrabold transition"
          :class="
            viewMode === 'classic'
              ? 'bg-white text-brand shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          "
          @click="viewMode = 'classic'"
        >
          <LayoutList class="size-4 shrink-0" aria-hidden="true" />
          Классический
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-extrabold transition"
          :class="
            viewMode === 'tiles'
              ? 'bg-white text-brand shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          "
          @click="viewMode = 'tiles'"
        >
          <LayoutGrid class="size-4 shrink-0" aria-hidden="true" />
          Плитки
        </button>
      </div>
    </div>

    <div
      v-if="tcBanner"
      class="mb-5 max-w-[840px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
    >
      {{ tcBanner }}
      <NuxtLink to="/profile" class="ml-1 underline decoration-amber-700/40 underline-offset-2 hover:text-amber-950">
        Профиль → интеграции
      </NuxtLink>
    </div>

    <div v-if="loadError" class="mb-5 max-w-[840px] rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      {{ loadError }}
    </div>

    <div v-else-if="loading" class="max-w-[840px] rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-card">
      Загрузка шаблонов…
    </div>

    <div v-else class="space-y-6">
      <div class="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card ring-1 ring-slate-900/5">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="create-template-heading" class="text-sm font-extrabold text-slate-900">Шаблон сборки</h2>
          <div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            <NuxtLink
              to="/templates"
              class="text-xs font-bold text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
            >
              Управление шаблонами
            </NuxtLink>
            <a
              v-if="currentTemplate?.teamcityBuildConfigUrl"
              :href="currentTemplate.teamcityBuildConfigUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-brand transition hover:bg-brand/5 hover:underline"
            >
              <ExternalLink class="size-3.5 shrink-0" aria-hidden="true" />
              Сборка в TeamCity
            </a>
            <span v-else class="text-xs font-semibold text-slate-500">—</span>
          </div>
        </div>

        <!-- Классический выбор: select -->
        <div v-if="viewMode === 'classic'">
          <AppStyledSelect
            v-model="selectedTemplateId"
            labelled-by="create-template-heading"
            class="w-full min-w-0"
            :options="templateOptions"
            placeholder="Выберите шаблон"
          />
        </div>

        <!-- Плитки: тот же selectedTemplateId, общая форма ниже -->
        <div v-else>
          <div v-if="!templateCards.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="mock in tilePlaceholderMocks"
              :key="mock.title"
              class="flex flex-col rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-left shadow-card"
            >
              <div class="h-1.5 w-10 rounded-full bg-slate-200" />
              <p class="mt-2 text-[13px] font-extrabold leading-snug text-slate-800">{{ mock.title }}</p>
              <p class="mt-1.5 text-[11px] font-medium leading-snug text-slate-500">{{ mock.blurb }}</p>
              <p class="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Нет шаблонов</p>
            </div>
          </div>

          <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <button
              v-for="card in templateCards"
              :key="card.id"
              type="button"
              class="flex flex-col rounded-lg border px-3 py-2.5 text-left shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              :class="
                isTemplateCardSelected(card.id)
                  ? 'border-brand bg-brand-light/60 ring-2 ring-brand/25'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-card-md'
              "
              @click="selectedTemplateId = String(card.id)"
            >
              <div class="flex items-start justify-between gap-1.5">
                <span class="line-clamp-2 min-w-0 flex-1 text-[13px] font-extrabold leading-snug text-slate-900">{{ card.name }}</span>
                <PersonalTemplateBadge v-if="card.isPersonal" compact class="shrink-0" />
              </div>
              <p class="mt-1.5 line-clamp-2 text-[11px] font-medium leading-snug text-slate-600">
                {{ card.description || 'Без описания' }}
              </p>
            </button>
          </div>
        </div>

        <div class="mt-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white ring-1 ring-slate-900/[0.04]">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/90"
            :aria-expanded="overridesPanelOpen"
            aria-controls="create-overrides-panel"
            @click="overridesPanelOpen = !overridesPanelOpen"
          >
            <span class="flex min-w-0 items-center gap-2.5">
              <ChevronDown
                class="size-5 shrink-0 text-slate-500 transition-transform duration-200"
                :class="overridesPanelOpen ? '' : '-rotate-90'"
                aria-hidden="true"
              />
              <span class="text-sm font-extrabold text-slate-900">Параметры (overrides)</span>
            </span>
            <NuxtLink
              v-if="currentTemplate"
              :to="`/templates/${currentTemplate.id}`"
              class="shrink-0 text-xs font-bold text-brand hover:underline"
              @click.stop
            >
              Открыть шаблон
            </NuxtLink>
          </button>

          <div
            v-show="overridesPanelOpen"
            id="create-overrides-panel"
            class="border-t border-slate-100 px-4 pb-4 pt-1"
          >
            <div class="overflow-hidden rounded-xl border border-slate-200">
              <div class="overflow-x-auto">
                <table class="min-w-[760px] w-full border-collapse text-sm">
                  <thead>
                    <tr class="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <th class="px-3 py-2.5">Key</th>
                      <th class="px-3 py-2.5">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!overrideRows.length">
                      <td colspan="2" class="px-3 py-8 text-center text-xs font-semibold text-slate-500">Нет параметров в шаблоне</td>
                    </tr>
                    <tr v-for="r in overrideRows" :key="r.key" class="border-b border-slate-100 last:border-b-0">
                      <td class="px-3 py-2.5 align-top font-mono text-xs text-slate-800">{{ r.key }}</td>
                      <td class="px-3 py-2.5 align-top">
                        <input
                          v-model="overrides[r.key]"
                          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-800 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p v-if="yamlPreviewError" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
              {{ yamlPreviewError }}
            </p>

            <details v-if="currentTemplate" class="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <summary class="cursor-pointer text-sm font-extrabold text-slate-800 [&::-webkit-details-marker]:hidden">
                YAML предпросмотр
              </summary>
              <div class="mt-3">
                <AppTextareaWithLineNumbers :model-value="yamlPreview" :spellcheck="false" min-height-class="min-h-[320px]" />
              </div>
            </details>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <NuxtLink
            to="/"
            class="inline-flex min-h-[40px] min-w-[100px] items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Отмена
          </NuxtLink>
          <AppButton class="min-h-[40px] min-w-[160px]" :loading="submitting" :disabled="!currentTemplate" @click="submitCreate">
            Создать OTE
          </AppButton>
        </div>

        <section
          v-if="creation"
          ref="creationPanelRef"
          class="mt-6 scroll-mt-28 border-t border-slate-200 pt-5"
          tabindex="-1"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <h2 class="text-base font-extrabold text-slate-900">Запрос #{{ creation.id }}</h2>
            <NuxtLink
              :to="`/create/requests/${creation.id}`"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand/25 bg-brand-light/50 px-3 py-1.5 text-xs font-extrabold text-brand transition hover:border-brand/40 hover:bg-brand-light"
            >
              <Terminal class="size-3.5 shrink-0" aria-hidden="true" />
              Отслеживание и лог
            </NuxtLink>
          </div>
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
              <dd class="mt-0.5"><span class="break-all font-mono text-xs text-slate-600">{{ creation.rabbitUrl }}</span></dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDown, ExternalLink, LayoutGrid, LayoutList, Terminal } from 'lucide-vue-next'
import { oteTcCreationStatusClass, oteTcCreationStatusLabel } from '~/utils/ote-tc-creation-status.js'

const toast = useToast()

/** Локальный выбор вида страницы: классический select или макет плиток */
const CREATE_VIEW_STORAGE_KEY = 'ote-manager:create-page-view'
/** Свернут/развернут блок параметров overrides */
const CREATE_OVERRIDES_PANEL_KEY = 'ote-manager:create-overrides-expanded'

const viewMode = ref(/** @type {'classic' | 'tiles'} */ ('classic'))
const overridesPanelOpen = ref(true)

const tilePlaceholderMocks = [
  { title: 'Пример: Windows full stack', blurb: 'Карточка-заглушка, пока список шаблонов пуст.' },
  { title: 'Пример: SaaS demo', blurb: 'После загрузки API здесь появятся реальные шаблоны.' },
  { title: 'Пример: Личный шаблон', blurb: 'Выбор карточки пока только визуальный (макет).' },
]

watch(viewMode, (mode) => {
  if (import.meta.client) {
    try {
      localStorage.setItem(CREATE_VIEW_STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }
})

watch(overridesPanelOpen, (open) => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(CREATE_OVERRIDES_PANEL_KEY, open ? '1' : '0')
  } catch {
    /* ignore */
  }
})

const loading = ref(true)
const loadError = ref('')
const templates = ref(/** @type {any[]} */ ([]))
const currentTemplateFull = ref(/** @type {any | null} */ (null))

/** Карточки плиток: те же шаблоны, что и в select */
const templateCards = computed(() => {
  const list = Array.isArray(templates.value) ? templates.value : []
  return list.map((t) => ({
    id: t.id,
    name: String(t.name || `Шаблон #${t.id}`),
    description: typeof t.description === 'string' ? t.description : '',
    isPersonal: Boolean(t.isPersonal),
  }))
})

const selectedTemplateId = ref('')
const overrides = ref(/** @type {Record<string, string>} */ ({}))

const submitting = ref(false)
const creation = ref(null)
const pollTimer = ref(null)
const creationPanelRef = ref(null)

const tcReady = ref(true)
const tcTokenSaved = ref(false)

const tcBanner = computed(() => {
  if (tcReady.value) return ''
  if (tcTokenSaved.value) return 'TeamCity доступен не полностью: проверьте токен/доступы в профиле.'
  return 'TeamCity недоступен: добавьте персональный токен в профиле.'
})

const templateOptions = computed(() => {
  const list = Array.isArray(templates.value) ? templates.value : []
  return list.map((t) => ({
    value: String(t.id),
    label: String(t.name || `#${t.id}`),
    isPersonal: Boolean(t.isPersonal),
  }))
})

const currentTemplate = computed(() => {
  const id = selectedTemplateId.value
  return templates.value.find((t) => String(t.id) === String(id)) || null
})

function isTemplateCardSelected(id) {
  return String(selectedTemplateId.value) === String(id)
}

const overrideRows = computed(() => {
  const t = currentTemplateFull.value
  const p = t && t.params && typeof t.params === 'object' ? t.params : {}
  return Object.keys(p)
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .map((key) => ({ key }))
})

function rebuildOverridesFromTemplate() {
  const t = currentTemplateFull.value
  const p = t && t.params && typeof t.params === 'object' ? t.params : {}
  /** @type {Record<string, string>} */
  const next = {}
  for (const [k, v] of Object.entries(p)) {
    const kk = String(k || '').trim()
    if (!kk) continue
    next[kk] = v == null ? '' : String(v)
  }
  overrides.value = next
}

watch(currentTemplate, async (t) => {
  currentTemplateFull.value = null
  if (!t?.id) {
    overrides.value = {}
    return
  }
  try {
    const res = await $fetch(`/api/ote/build-templates/${encodeURIComponent(String(t.id))}`, { credentials: 'include' })
    currentTemplateFull.value = res?.template || null
  } catch {
    currentTemplateFull.value = null
  } finally {
    rebuildOverridesFromTemplate()
  }
})

function extractPlaceholders(yaml) {
  const s = String(yaml || '')
  const re = /%([^%\s\r\n]+)%/g
  /** @type {Set<string>} */
  const set = new Set()
  let m
  while ((m = re.exec(s))) {
    const k = String(m[1] || '').trim()
    if (k) set.add(k)
  }
  return [...set]
}

const yamlPreviewError = computed(() => {
  const t = currentTemplateFull.value
  if (!t) return ''
  const missing = extractPlaceholders(t.yaml || '').filter((k) => !(k in overrides.value))
  if (!missing.length) return ''
  return `Не заданы параметры для YAML: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ` (+${missing.length - 12})` : ''}`
})

const yamlPreview = computed(() => {
  const t = currentTemplateFull.value
  if (!t) return ''
  const y = String(t.yaml || '')
  return y.replace(/%([^%\s\r\n]+)%/g, (_all, key) => {
    const k = String(key || '').trim()
    return overrides.value[k] != null ? String(overrides.value[k]) : ''
  })
})

async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    const [tc, bt] = await Promise.all([
      $fetch('/api/me/tc-credentials', { credentials: 'include' }).catch(() => null),
      $fetch('/api/ote/build-templates', { credentials: 'include' }),
    ])
    tcReady.value = Boolean(tc?.teamcity?.ready)
    tcTokenSaved.value = Boolean(tc?.teamcity?.tokenSaved)

    templates.value = Array.isArray(bt?.templates) ? bt.templates : []
    if (!selectedTemplateId.value && templates.value.length) {
      selectedTemplateId.value = String(templates.value[0].id)
    }
    // подтянем детали для выбранного шаблона
    const cur = templates.value.find((t) => String(t.id) === String(selectedTemplateId.value)) || null
    if (cur?.id) {
      try {
        const res = await $fetch(`/api/ote/build-templates/${encodeURIComponent(String(cur.id))}`, { credentials: 'include' })
        currentTemplateFull.value = res?.template || null
      } catch {
        currentTemplateFull.value = null
      }
      rebuildOverridesFromTemplate()
    }
  } catch (e) {
    loadError.value = e?.data?.message || e?.message || String(e)
    templates.value = []
  } finally {
    loading.value = false
  }
}

async function refreshCreation() {
  const c = creation.value
  if (!c?.id) return
  try {
    const res = await $fetch(`/api/ote/create/requests/${encodeURIComponent(String(c.id))}`, { credentials: 'include' })
    if (res?.creation) creation.value = res.creation
  } catch {
    /* ignore */
  }
}

function stopPoll() {
  if (pollTimer.value != null) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function startPoll() {
  stopPoll()
  pollTimer.value = setInterval(() => {
    void refreshCreation()
  }, 9000)
}

onBeforeUnmount(() => stopPoll())

async function submitCreate() {
  const t = currentTemplate.value
  if (!t) return
  submitting.value = true
  try {
    const res = await $fetch('/api/ote/create/teamcity', {
      method: 'POST',
      credentials: 'include',
      body: { buildTemplateId: Number(t.id), overrides: overrides.value },
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
    creationPanelRef.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (import.meta.client) {
    try {
      const stored = localStorage.getItem(CREATE_VIEW_STORAGE_KEY)
      if (stored === 'tiles' || stored === 'classic') viewMode.value = stored
      const panel = localStorage.getItem(CREATE_OVERRIDES_PANEL_KEY)
      if (panel === '0' || panel === 'false') overridesPanelOpen.value = false
      if (panel === '1' || panel === 'true') overridesPanelOpen.value = true
    } catch {
      /* ignore */
    }
  }
  void loadAll()
})

useHead({ title: 'Создание OTE · OTE Manager' })
</script>

