<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-[22px] font-extrabold text-slate-900">{{ isNew ? 'Новый шаблон сборки' : 'Редактирование шаблона сборки' }}</h1>
      <NuxtLink
        to="/templates"
        class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
      >
        К списку
      </NuxtLink>
    </div>

    <div v-if="loadError" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
      {{ loadError }}
    </div>

    <div v-else-if="loading" class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-card">
      Загрузка…
    </div>

    <div v-else class="max-w-[980px] space-y-6">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <div class="min-w-0">
          <AppInput v-model="form.name" label="Название" placeholder="Windows SaaS · latest" autocomplete="off" />
        </div>
        <label
          class="mt-5 flex cursor-pointer items-start gap-3.5 rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-violet-50/20 p-4 transition hover:border-violet-200/60 hover:shadow-sm"
        >
          <input
            v-model="form.isPersonal"
            type="checkbox"
            class="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-brand focus:ring-2 focus:ring-brand/30"
          />
          <span class="min-w-0">
            <span class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-extrabold text-slate-900">Личный шаблон</span>
              <span
                class="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-violet-900"
              >
                только вы
              </span>
            </span>
            <span class="mt-1.5 block text-xs font-semibold leading-relaxed text-slate-600">
              Такой шаблон не попадает в журнал аудита и в списке виден только вам.
            </span>
          </span>
        </label>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <AppInput v-model="form.teamcityBuildTypeId" label="TeamCity buildTypeId" placeholder="Some_BuildTypeId" autocomplete="off" />
          <div class="flex flex-col justify-end">
            <p class="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Ссылка</p>
            <a
              v-if="computedTeamcityBuildUrl"
              :href="computedTeamcityBuildUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
            >
              Открыть в TeamCity
            </a>
            <p v-else class="mt-1 text-xs font-semibold text-slate-400">—</p>
          </div>
        </div>

        <div class="mt-5">
          <label class="mb-1.5 block text-sm font-bold text-slate-800">Описание (необязательно)</label>
          <textarea
            v-model="form.description"
            rows="2"
            class="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
            placeholder="Для кого и когда использовать шаблон…"
          />
        </div>

        <div class="mt-6">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label class="block text-sm font-bold text-slate-800">Параметры (key/value)</label>
            <AppButton size="sm" variant="secondary" class="!px-3 !py-1.5 !text-xs" @click="addParam">Добавить</AppButton>
          </div>
          <div class="overflow-hidden rounded-xl border border-slate-200">
            <div class="overflow-x-auto">
              <table class="min-w-[760px] w-full border-collapse text-sm">
                <thead>
                  <tr class="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th class="px-3 py-2.5">Key</th>
                    <th class="px-3 py-2.5">Value</th>
                    <th class="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!form.params.length">
                    <td colspan="3" class="px-3 py-8 text-center text-xs font-semibold text-slate-500">
                      Параметров нет. Добавьте key/value (например <span class="font-mono">metadata.tag</span>, <span class="font-mono">caseone.version</span>).
                    </td>
                  </tr>
                  <tr v-for="(p, idx) in form.params" :key="idx" class="border-b border-slate-100 last:border-b-0">
                    <td class="px-3 py-2.5 align-top">
                      <input
                        v-model="p.key"
                        class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-800 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                        placeholder="metadata.tag"
                      />
                    </td>
                    <td class="px-3 py-2.5 align-top">
                      <input
                        v-model="p.value"
                        class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-800 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                        placeholder="my-ote-01"
                      />
                    </td>
                    <td class="px-3 py-2.5 align-top">
                      <button
                        type="button"
                        class="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-extrabold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        @click="removeParam(idx)"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p class="mt-2 text-xs font-semibold text-slate-500">
            В YAML используйте подстановки вида <span class="font-mono">%metadata.tag%</span>. При запуске можно переопределить значения.
          </p>
        </div>

        <div class="mt-5">
          <label class="mb-1.5 block text-sm font-bold text-slate-800">YAML</label>
          <AppTextareaWithLineNumbers
            v-model="form.yaml"
            :spellcheck="false"
            min-height-class="min-h-[420px]"
            placeholder="metadata:&#10;  tag: &quot;%metadata.tag%&quot;&#10;..."
          />
          <p class="mt-1.5 text-xs font-semibold text-slate-500">При сохранении выполняется проверка синтаксиса YAML.</p>
        </div>
        <div v-if="!isNew && meta.createdAt" class="mt-6 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
          <p>Создан: {{ formatUtc(meta.createdAt) }} · {{ meta.createdByLogin || '—' }}</p>
          <p class="mt-1">Изменён: {{ formatUtc(meta.updatedAt) }} · {{ meta.updatedByLogin || '—' }}</p>
        </div>
        <div class="mt-8 flex flex-wrap gap-3">
          <AppButton :loading="saving" @click="save">{{ isNew ? 'Создать' : 'Сохранить' }}</AppButton>
          <AppButton
            v-if="!isNew"
            variant="danger"
            :loading="deleting"
            class="!bg-rose-600 !text-white hover:!bg-rose-700"
            @click="del"
          >
            Удалить
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const idParam = computed(() => String(route.params.id || ''))
const isNew = computed(() => idParam.value === 'new')

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const deleting = ref(false)

const form = reactive({
  name: '',
  description: '',
  teamcityBuildTypeId: '',
  /** @type {{ key: string, value: string }[]} */
  params: [],
  yaml: '',
  isPersonal: false,
})

const meta = reactive({
  createdAt: '',
  updatedAt: '',
  createdByLogin: '',
  updatedByLogin: '',
})

function formatUtc(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' Z')
}

function applyTemplate(t) {
  form.name = t.name || ''
  form.description = t.description || ''
  form.yaml = t.yaml || ''
  form.teamcityBuildTypeId = t.teamcityBuildTypeId || ''
  const p = t.params && typeof t.params === 'object' ? t.params : {}
  form.params = Object.entries(p)
    .map(([key, value]) => ({ key: String(key || ''), value: value == null ? '' : String(value) }))
    .filter((x) => x.key.trim())
  form.isPersonal = Boolean(t.isPersonal)
  meta.createdAt = t.createdAt || ''
  meta.updatedAt = t.updatedAt || ''
  meta.createdByLogin = t.createdByLogin || ''
  meta.updatedByLogin = t.updatedByLogin || ''
}

const computedTeamcityBuildUrl = computed(() => {
  const id = String(form.teamcityBuildTypeId || '').trim()
  if (!id) return ''
  // URL сохраняется на сервере автоматически; тут — удобный кликабельный вид
  return `https://ci.pravo.tech/buildConfiguration/${encodeURIComponent(id)}`
})

async function loadOne() {
  if (isNew.value) {
    form.name = ''
    form.description = ''
    form.yaml =
      'metadata:\n  tag: "%metadata.tag%"\n  days_life: 1\n\ncaseone:\n  version: "%caseone.version%"\n'
    form.teamcityBuildTypeId = ''
    form.params = [
      { key: 'metadata.tag', value: '' },
      { key: 'caseone.version', value: 'latest' },
    ]
    form.isPersonal = false
    meta.createdAt = ''
    meta.updatedAt = ''
    meta.createdByLogin = ''
    meta.updatedByLogin = ''
    loading.value = false
    loadError.value = ''
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch(`/api/ote/build-templates/${encodeURIComponent(idParam.value)}`, { credentials: 'include' })
    const t = res?.template
    if (!t) {
      loadError.value = 'Шаблон не найден'
      return
    }
    applyTemplate(t)
  } catch (e) {
    loadError.value = e?.data?.message || e?.message || String(e)
  } finally {
    loading.value = false
  }
}

watch(
  () => idParam.value,
  () => {
    void loadOne()
  },
)

onMounted(() => {
  void loadOne()
})

async function save() {
  saving.value = true
  try {
    /** @type {Record<string, string>} */
    const params = {}
    for (const p of form.params) {
      const k = String(p?.key || '').trim()
      if (!k) continue
      params[k] = p?.value == null ? '' : String(p.value)
    }
    if (isNew.value) {
      const res = await $fetch('/api/ote/build-templates', {
        method: 'POST',
        credentials: 'include',
        body: {
          name: form.name,
          description: form.description,
          teamcityBuildTypeId: form.teamcityBuildTypeId,
          params,
          yaml: form.yaml,
          isPersonal: form.isPersonal,
        },
      })
      const id = res?.template?.id
      if (!id) {
        toast.show('Не удалось создать шаблон', 'error')
        return
      }
      toast.show('Шаблон создан', 'success')
      await router.replace(`/templates/${id}`)
      return
    }
    const res = await $fetch(`/api/ote/build-templates/${encodeURIComponent(idParam.value)}`, {
      method: 'PUT',
      credentials: 'include',
      body: {
        name: form.name,
        description: form.description,
        teamcityBuildTypeId: form.teamcityBuildTypeId,
        params,
        yaml: form.yaml,
        isPersonal: form.isPersonal,
      },
    })
    if (res?.template) applyTemplate(res.template)
    toast.show('Сохранено', 'success')
  } catch (e) {
    const msg = e?.data?.message || e?.message || String(e)
    toast.show(msg, 'error')
  } finally {
    saving.value = false
  }
}

function addParam() {
  form.params.push({ key: '', value: '' })
}

function removeParam(idx) {
  form.params.splice(idx, 1)
}

async function del() {
  if (deleting.value) return
  if (isNew.value) return
  deleting.value = true
  try {
    await $fetch(`/api/ote/build-templates/${encodeURIComponent(idParam.value)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    toast.show('Шаблон удалён', 'success')
    await router.push('/templates')
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  } finally {
    deleting.value = false
  }
}

useHead(() => ({ title: isNew.value ? 'Новый шаблон сборки · OTE Manager' : `Шаблон сборки · OTE Manager` }))
</script>
