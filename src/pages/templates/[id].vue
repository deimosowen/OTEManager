<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-[22px] font-extrabold text-slate-900">{{ isNew ? 'Новый шаблон' : 'Редактирование шаблона' }}</h1>
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

    <div v-else class="max-w-[960px] space-y-6">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          <div class="min-w-0 flex-1">
            <AppInput v-model="form.name" label="Название" placeholder="Автотесты, Windows single" autocomplete="off" />
          </div>
          <div class="w-full shrink-0 sm:w-52">
            <AppSelect v-model="form.targetOs" class="w-full" label="Тип (ОС)" :options="osOptions" />
          </div>
        </div>
        <p class="mt-2 max-w-xl text-xs font-semibold text-slate-500">
          «Все» — шаблон виден при любой сборке. «Windows» / «Linux» — только при соответствующем пресете на странице создания OTE.
        </p>
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
              Такой шаблон не попадает в журнал аудита и в списке каталога виден только вам. При создании OTE YAML по-прежнему уходит в TeamCity.
            </span>
          </span>
        </label>
        <div class="mt-5">
          <label class="mb-1.5 block text-sm font-bold text-slate-800">Описание (необязательно)</label>
          <textarea
            v-model="form.description"
            rows="2"
            class="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
            placeholder="Для кого и когда использовать шаблон…"
          />
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { DEPLOYMENT_TEMPLATE_OS_OPTIONS } from '~/constants/deployment-template-os.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const idParam = computed(() => String(route.params.id || ''))
const isNew = computed(() => idParam.value === 'new')

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)

const osOptions = DEPLOYMENT_TEMPLATE_OS_OPTIONS

const form = reactive({
  name: '',
  targetOs: 'all',
  description: '',
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
  const os = String(t.targetOs || '').toLowerCase()
  form.targetOs = os === 'windows' || os === 'linux' ? os : 'all'
  form.description = t.description || ''
  form.yaml = t.yaml || ''
  form.isPersonal = Boolean(t.isPersonal)
  meta.createdAt = t.createdAt || ''
  meta.updatedAt = t.updatedAt || ''
  meta.createdByLogin = t.createdByLogin || ''
  meta.updatedByLogin = t.updatedByLogin || ''
}

async function loadOne() {
  if (isNew.value) {
    form.name = ''
    form.targetOs = 'all'
    form.description = ''
    form.yaml =
      'metadata:\n  tag: "%metadata.tag%"\n  days_life: 1\n\ncaseone:\n  version: "%caseone.version%"\n'
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
    const res = await $fetch(`/api/ote/templates/${encodeURIComponent(idParam.value)}`, { credentials: 'include' })
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
    if (isNew.value) {
      const res = await $fetch('/api/ote/templates', {
        method: 'POST',
        credentials: 'include',
        body: {
          name: form.name,
          targetOs: form.targetOs,
          description: form.description,
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
    const res = await $fetch(`/api/ote/templates/${encodeURIComponent(idParam.value)}`, {
      method: 'PUT',
      credentials: 'include',
      body: {
        name: form.name,
        targetOs: form.targetOs,
        description: form.description,
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

useHead(() => ({ title: isNew.value ? 'Новый шаблон · OTE Manager' : `Шаблон · OTE Manager` }))
</script>
