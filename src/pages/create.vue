<template>
  <div>
    <div class="mb-5">
      <h1 class="text-[22px] font-extrabold text-slate-900">Создание новой OTE</h1>
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

    <div v-else class="max-w-[720px] rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
      <OteTypePicker
        v-model="selectedPresetId"
        heading="Конфигурация сборки TeamCity"
        :types="pickerTypes"
      />

      <div v-if="currentPreset" class="mt-4">
        <a
          :href="currentPreset.buildConfigUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
        >
          <ExternalLink class="size-3.5 shrink-0" aria-hidden="true" />
          Открыть эту сборку в TeamCity
        </a>
      </div>

      <div v-if="currentPreset" class="mt-8 space-y-5">
        <template v-for="field in currentPreset.fields" :key="field.name">
          <AppSelect
            v-if="field.type === 'select'"
            v-model="formProps[field.name]"
            class="w-full"
            :label="field.label"
            :options="field.options || []"
          />
          <div v-else-if="field.type === 'template_select'">
            <template v-if="templates.length">
              <AppSelect
                v-model="selectedDeploymentTemplateId"
                class="w-full"
                :label="field.label"
                :options="templateFieldOptions"
              />
              <p v-if="field.hint" class="mt-1 text-xs font-semibold text-slate-500">{{ field.hint }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold">
                <NuxtLink
                  v-if="templateEditHref"
                  :to="templateEditHref"
                  class="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  <ExternalLink class="size-3.5" aria-hidden="true" />
                  Открыть шаблон для правки
                </NuxtLink>
                <NuxtLink to="/templates" class="text-slate-500 hover:text-brand hover:underline">Все шаблоны</NuxtLink>
              </div>
            </template>
            <div v-else>
              <label class="mb-1.5 block text-sm font-bold text-slate-800">{{ field.label }} (YAML)</label>
              <textarea
                v-model="formProps[field.name]"
                rows="14"
                spellcheck="false"
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-900 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                placeholder="metadata:&#10;  tag: &quot;%metadata.tag%&quot;&#10;..."
              />
              <p v-if="field.hint" class="mt-1 text-xs font-semibold text-slate-500">{{ field.hint }}</p>
              <p class="mt-2 text-xs font-semibold text-slate-500">
                В каталоге нет шаблонов.
                <NuxtLink to="/templates/new" class="font-bold text-brand hover:underline">Создать шаблон</NuxtLink>
                или
                <NuxtLink to="/templates" class="font-bold text-brand hover:underline">список шаблонов</NuxtLink>
              </p>
            </div>
          </div>
          <div v-else>
            <AppInput v-model="formProps[field.name]" :label="field.label" :placeholder="field.placeholder || ''" autocomplete="off" />
            <p v-if="field.hint" class="mt-1 text-xs font-semibold text-slate-500">{{ field.hint }}</p>
          </div>
        </template>
      </div>

      <div class="mt-8 flex flex-wrap gap-3">
        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-500 transition hover:border-rose-300 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Отмена
        </NuxtLink>
        <AppButton :loading="submitting" :disabled="!currentPreset" @click="submitCreate">Создать OTE</AppButton>
      </div>
    </div>

    <section
      v-if="creation"
      class="mt-8 max-w-[720px] rounded-2xl border border-slate-200 bg-white p-8 shadow-card"
    >
      <h2 class="text-base font-extrabold text-slate-900">Запрос #{{ creation.id }}</h2>
      <p class="mt-1 text-sm font-semibold text-slate-600">
        Статус:
        <span :class="statusClass(creation.status)">{{ statusLabel(creation.status) }}</span>
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
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ExternalLink } from 'lucide-vue-next'

const toast = useToast()

const presets = ref([])
/** @type {import('vue').Ref<{ id: number, name: string }[]>} */
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

const pickerTypes = computed(() =>
  presets.value.map((p) => ({
    id: p.id,
    name: p.label,
    subtitle: p.subtitle,
  })),
)

const currentPreset = computed(() => presets.value.find((p) => p.id === selectedPresetId.value) || null)

const templateFieldOptions = computed(() =>
  templates.value.map((t) => ({
    value: String(t.id),
    label: t.name,
  })),
)

const templateEditHref = computed(() => {
  const id = String(selectedDeploymentTemplateId.value || '').trim()
  if (!/^\d+$/.test(id)) return ''
  const t = templates.value.find((x) => String(x.id) === id)
  return t ? `/templates/${t.id}` : ''
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
      next[f.name] = f.options.some((o) => String(o.value) === String(kept)) ? String(kept) : String(f.options[0].value)
    } else {
      next[f.name] = typeof prevProps[f.name] === 'string' ? prevProps[f.name] : ''
    }
  }
  formProps.value = next
}

watch(selectedPresetId, (n) => {
  if (!presets.value.length || !n) return
  rebuildFormPreservingCommon(n)
})

watch(
  () => templates.value.length,
  () => {
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
    const [presRes, tplRes] = await Promise.all([
      $fetch('/api/ote/create/presets', { credentials: 'include' }),
      $fetch('/api/ote/templates', { credentials: 'include' }).catch(() => ({ templates: [] })),
    ])
    presets.value = Array.isArray(presRes?.presets) ? presRes.presets : []
    const raw = Array.isArray(tplRes?.templates) ? tplRes.templates : []
    templates.value = raw.map((t) => ({
      id: t.id,
      name: String(t.name || ''),
    }))
  } catch (e) {
    presetsLoadError.value = e?.data?.message || e?.message || 'Не удалось загрузить пресеты'
    return
  }
  if (!presets.value.length) return
  if (!presets.value.some((p) => p.id === selectedPresetId.value)) {
    selectedPresetId.value = presets.value[0].id
  }
  rebuildFormPreservingCommon(selectedPresetId.value)
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
  } catch (e) {
    const msg = e?.data?.message || e?.message || String(e)
    toast.show(msg, 'error')
  } finally {
    submitting.value = false
  }
}

function statusLabel(s) {
  switch (s) {
    case 'queued':
      return 'В очереди'
    case 'running':
      return 'Выполняется'
    case 'succeeded':
      return 'Успешно'
    case 'failed':
      return 'Ошибка'
    default:
      return String(s || '—')
  }
}

function statusClass(s) {
  if (s === 'succeeded') return 'text-emerald-700'
  if (s === 'failed') return 'text-rose-700'
  if (s === 'running' || s === 'queued') return 'text-amber-700'
  return 'text-slate-700'
}
</script>
