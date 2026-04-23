<template>
  <div class="mx-auto max-w-2xl">
    <header class="mb-8">
      <h1 class="text-[22px] font-extrabold tracking-tight text-slate-900">Профиль</h1>
      <p class="mt-1 text-sm text-slate-500">Яндекс ID</p>
    </header>

    <div class="space-y-6">
      <!-- Аккаунт -->
      <section class="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card">
        <div class="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <h2 class="text-sm font-extrabold text-slate-800">Аккаунт</h2>
        </div>
        <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-4">
            <img
              v-if="auth.user?.avatarUrl"
              :src="auth.user.avatarUrl"
              alt=""
              class="size-14 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200/80"
            />
            <div
              v-else
              class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-sky-400 text-lg font-extrabold text-white shadow-inner"
            >
              {{ auth.initials }}
            </div>
            <div class="min-w-0">
              <div class="truncate text-lg font-extrabold text-slate-900">{{ auth.displayName }}</div>
              <div class="truncate text-sm font-medium text-slate-600">{{ auth.user?.email || '—' }}</div>
            </div>
          </div>
          <AppButton variant="secondary" class="shrink-0 self-start sm:self-center" @click="logout">
            <LogOut class="size-4" />
            Выйти
          </AppButton>
        </div>
      </section>

      <!-- TeamCity -->
      <section class="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <div class="flex items-center gap-2">
            <KeyRound class="size-4 text-slate-400" aria-hidden="true" />
            <h2 class="text-sm font-extrabold text-slate-800">TeamCity</h2>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <span
              class="rounded-md px-2 py-0.5 text-xs font-semibold"
              :class="tc.tokenSaved ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-600'"
            >
              {{ tc.tokenSaved ? 'Токен сохранён' : 'Токен не задан' }}
            </span>
            <span
              v-if="tc.ready"
              class="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-950"
              title="Запросы к REST TeamCity возможны"
            >
              API доступен
            </span>
          </div>
        </div>

        <div class="space-y-5 p-5">
          <p class="text-sm leading-relaxed text-slate-600">
            Для взаимодействия с OTE. Сервер обращается к
            <span class="font-mono text-[13px] text-slate-800">{{ tcUiBase }}</span>
            от вашего имени.
          </p>

          <details class="group rounded-xl border border-slate-100 bg-slate-50/50">
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-brand/20 marker:content-none [&::-webkit-details-marker]:hidden hover:bg-slate-50/80"
            >
              <span>Как получить токен</span>
              <ChevronDown
                class="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div class="border-t border-slate-100 px-4 pb-4 pt-1 text-sm text-slate-600">
              <ol class="mt-2 list-decimal space-y-2 pl-4 leading-relaxed">
                <li>Войдите в TeamCity (<span class="font-mono text-xs">{{ tcUiBase }}</span>).</li>
                <li>Имя пользователя → профиль → <strong>Access Tokens</strong>.</li>
                <li>Создайте токен, скопируйте значение и вставьте ниже (в TeamCity оно показывается один раз).</li>
              </ol>
              <p class="mt-3 text-xs text-slate-500">
                <a
                  class="font-semibold text-brand underline decoration-brand/25 underline-offset-2 hover:decoration-brand"
                  href="https://www.jetbrains.com/help/teamcity/configuring-your-user-profile.html#Managing+Access+Tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Справка JetBrains</a
                >
              </p>
            </div>
          </details>

          <div>
            <label class="mb-1.5 block text-sm font-bold text-slate-700" for="tc-token">Новый токен</label>
            <p id="tc-token-hint" class="mb-2 text-xs text-slate-500">Только строка токена, без слова Bearer.</p>
            <input
              id="tc-token"
              v-model="tokenInput"
              type="password"
              autocomplete="off"
              aria-describedby="tc-token-hint"
              class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Вставьте токен"
            />
          </div>

          <div class="flex flex-wrap gap-2">
            <AppButton variant="primary" :loading="saving" :disabled="!tokenInput.trim()" @click="saveToken">
              Сохранить
            </AppButton>
            <AppButton variant="secondary" :loading="removing" :disabled="!tc.tokenSaved" @click="removeToken">
              Удалить
            </AppButton>
          </div>

          <p v-if="message" class="text-sm font-semibold text-red-700">
            {{ message }}
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ChevronDown, KeyRound, LogOut } from 'lucide-vue-next'
import { fetchInternalApi } from '~/composables/internalApi'
import { useToast } from '~/composables/useToast'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const rt = useRuntimeConfig()
const toast = useToast()

const tcUiBase = computed(() => {
  const u = String(rt.public.teamcityUiBaseUrl || '').replace(/\/+$/, '')
  return u || 'https://ci.pravo.tech'
})

const tc = reactive({
  tokenSaved: false,
  ready: false,
})
const tokenInput = ref('')
const saving = ref(false)
const removing = ref(false)
const message = ref('')

function errorTextFromResponseBody(text, status) {
  const raw = String(text || '').trim()
  if (!raw) return `Ошибка ${status}`
  try {
    const j = JSON.parse(raw)
    if (j && typeof j.message === 'string' && j.message.trim()) return j.message.trim()
  } catch {
    /* не JSON */
  }
  return raw.length > 400 ? `${raw.slice(0, 400)}…` : raw
}

async function loadIntegrations() {
  message.value = ''
  try {
    const res = await fetchInternalApi('/api/me/tc-credentials')
    if (!res.ok) return
    const data = await res.json()
    if (data?.teamcity) {
      tc.tokenSaved = Boolean(data.teamcity.tokenSaved)
      tc.ready = Boolean(data.teamcity.ready)
    }
  } catch {
    /* сеть */
  }
}

onMounted(() => {
  loadIntegrations()
})

async function saveToken() {
  const token = tokenInput.value.trim()
  if (token.length < 8) {
    message.value = 'Токен слишком короткий'
    return
  }
  saving.value = true
  message.value = ''
  try {
    const res = await fetchInternalApi('/api/me/tc-credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const errText = await res.text()
    if (!res.ok) {
      const errMsg = errorTextFromResponseBody(errText, res.status)
      message.value = errMsg
      toast.show(errMsg, 'warn', 5000)
      return
    }
    message.value = ''
    toast.show('Токен сохранён', 'success')
    tokenInput.value = ''
    await loadIntegrations()
  } catch {
    message.value = 'Ошибка сети'
    toast.show('Ошибка сети', 'warn')
  } finally {
    saving.value = false
  }
}

async function removeToken() {
  removing.value = true
  message.value = ''
  try {
    const res = await fetchInternalApi('/api/me/tc-credentials', { method: 'DELETE' })
    const errText = await res.text()
    if (!res.ok) {
      const errMsg = errorTextFromResponseBody(errText, res.status)
      message.value = errMsg
      toast.show(errMsg, 'warn', 5000)
      return
    }
    message.value = ''
    toast.show('Токен удалён', 'success')
    await loadIntegrations()
  } catch {
    message.value = 'Ошибка сети'
    toast.show('Ошибка сети', 'warn')
  } finally {
    removing.value = false
  }
}

async function logout() {
  await auth.logout()
  await router.push('/login')
}
</script>
