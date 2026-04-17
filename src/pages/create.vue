<template>
  <div>
    <div class="mb-5">
      <h1 class="text-[22px] font-extrabold text-slate-900">Создание новой OTE</h1>
    </div>

    <div class="max-w-[720px] rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
      <OteTypePicker v-model="form.envTypeId" />

      <div class="mt-8 space-y-5">
        <AppInput v-model="form.name" label="Имя OTE" placeholder="ote-test-env" autocomplete="off" />
        <AppSelect class="w-full" v-model="form.caseOneVersion" label="Версия CaseOne" :options="caseOneOptions" />
        <AppSelect class="w-full" v-model="form.deployTemplate" label="Шаблон деплоя" :options="templateOptions" />
        <AppSelect class="w-full" v-model="form.dbVersion" label="Версия БД" :options="dbOptions" />
      </div>

      <div class="mt-8 flex gap-3">
        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-500 transition hover:border-rose-300 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Отмена
        </NuxtLink>
        <AppButton :loading="submitting" @click="submit">Создать OTE</AppButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { OTE_ENV_TYPES } from '~/constants/ote'
import { useEnvironmentsStore } from '~/stores/environments'

const store = useEnvironmentsStore()
const router = useRouter()
const toast = useToast()

const submitting = ref(false)

const form = reactive({
  envTypeId: 'astra-linux',
  name: '',
  caseOneVersion: 'Master-env',
  deployTemplate: 'standard',
  dbVersion: 'pg14',
})

const caseOneOptions = [
  { value: 'Master-env', label: 'Master-env' },
  { value: 'Release-2.31', label: 'Release-2.31' },
  { value: 'Release-2.30', label: 'Release-2.30' },
  { value: 'Release-2.29', label: 'Release-2.29' },
]

const templateOptions = [
  { value: 'product', label: 'Продукт' },
  { value: 'standard', label: 'Стандартный' },
  { value: 'minimal', label: 'Минимальный' },
]

const dbOptions = [
  { value: 'pg14', label: 'PostgreSQL 14' },
  { value: 'pg13', label: 'PostgreSQL 13' },
  { value: 'pg12', label: 'PostgreSQL 12' },
]

const envTypeName = computed(() => OTE_ENV_TYPES.find((t) => t.id === form.envTypeId)?.name || 'Astra Linux')

async function submit() {
  const name = form.name.trim()
  if (!name) {
    toast.show('Введите имя OTE', 'error')
    return
  }
  submitting.value = true
  try {
    const created = store.create({
      name,
      envTypeName: envTypeName.value,
      caseOneVersion: form.caseOneVersion,
      deployTemplate: form.deployTemplate,
      dbVersion: form.dbVersion,
    })
    toast.show(`OTE «${name}» создана`, 'success')
    await router.push(`/environments/${created.id}`)
  } finally {
    submitting.value = false
  }
}
</script>
