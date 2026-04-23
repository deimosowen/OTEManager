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
        <AppInput v-model="form.name" label="Название" placeholder="Автотесты, Windows single" autocomplete="off" />
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
          <textarea
            v-model="form.yaml"
            spellcheck="false"
            class="min-h-[420px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-900 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
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

const route = useRoute()
const router = useRouter()
const toast = useToast()

const idParam = computed(() => String(route.params.id || ''))
const isNew = computed(() => idParam.value === 'new')

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)

const form = reactive({
  name: '',
  description: '',
  yaml: '',
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
  meta.createdAt = t.createdAt || ''
  meta.updatedAt = t.updatedAt || ''
  meta.createdByLogin = t.createdByLogin || ''
  meta.updatedByLogin = t.updatedByLogin || ''
}

async function loadOne() {
  if (isNew.value) {
    form.name = ''
    form.description = ''
    form.yaml =
      'metadata:\n  tag: "%metadata.tag%"\n  days_life: 1\n\ncaseone:\n  version: "%caseone.version%"\n'
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
          description: form.description,
          yaml: form.yaml,
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
        description: form.description,
        yaml: form.yaml,
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
