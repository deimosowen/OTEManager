<template>
  <div class="mx-auto w-full max-w-4xl min-w-0 px-3 pb-12 pt-2 sm:px-5">
    <!-- Шапка: компактная, но с характером -->
    <header
      class="relative mb-6 min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-brand-light/[0.15] px-5 py-4 shadow-sm ring-1 ring-slate-900/[0.04] sm:px-6 sm:py-5"
    >
      <div class="pointer-events-none absolute -right-12 top-0 size-32 rounded-full bg-brand/[0.07] blur-2xl" aria-hidden="true" />
      <!-- Колонка: иначе при sm:flex-row + min-w-0 текст сжимается рядом с кнопками и рвётся по строкам -->
      <div class="relative flex flex-col gap-4">
        <div class="min-w-0 w-full">
          <p class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Личный кабинет</p>
          <h1 class="mt-1.5 text-xl font-extrabold tracking-tight text-slate-900">Профиль</h1>
          <div class="mt-2 space-y-1.5 text-[13px] font-medium leading-relaxed text-slate-600 hyphens-none sm:text-[14px]">
            <p class="max-w-none">
              Вы вошли через <span class="whitespace-nowrap">Яндекс ID</span>.
            </p>
            <p class="max-w-none">
              Ниже можно настроить <strong class="font-semibold text-slate-700">часовой пояс</strong> для дат в интерфейсе и токен
              <strong class="whitespace-nowrap font-semibold text-slate-700">TeamCity</strong>
              для операций с OTE.
            </p>
          </div>
        </div>
        <nav class="flex w-full flex-wrap gap-2 lg:hidden" aria-label="Разделы страницы">
          <button
            v-for="link in navLinks"
            :key="link.id"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-brand/40 hover:bg-brand-light/40 hover:text-brand"
            @click="scrollTo(link.id)"
          >
            <component :is="link.icon" class="size-3.5 text-slate-400" aria-hidden="true" />
            {{ link.label }}
          </button>
        </nav>
      </div>
    </header>

    <div class="lg:flex lg:items-start lg:gap-8">
      <nav
        class="mb-4 hidden shrink-0 lg:sticky lg:top-24 lg:block lg:w-44"
        aria-label="Разделы настроек"
      >
        <p class="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">На странице</p>
        <ul class="space-y-1 rounded-xl border border-slate-200/90 bg-white p-2 shadow-card ring-1 ring-slate-900/[0.03]">
          <li v-for="link in navLinks" :key="link.id">
            <a
              :href="`#${link.id}`"
              class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-600 outline-none transition hover:bg-brand-light/60 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/30"
              @click.prevent="scrollTo(link.id)"
            >
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 shadow-inner ring-1 ring-slate-200/80"
              >
                <component :is="link.icon" class="size-4" aria-hidden="true" />
              </span>
              <span class="leading-tight">{{ link.label }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <div
        class="min-w-0 flex-1 divide-y divide-slate-100 overflow-visible rounded-2xl border border-slate-200/95 bg-white shadow-card ring-1 ring-slate-900/[0.04]"
      >
        <!-- Аккаунт -->
        <section id="profile-account" class="profile-section-scroll scroll-mt-24 bg-gradient-to-r from-slate-50/[0.65] via-white to-transparent px-5 py-5 sm:px-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex min-w-0 gap-4">
              <img
                v-if="auth.user?.avatarUrl"
                :src="auth.user.avatarUrl"
                alt=""
                class="size-[52px] shrink-0 rounded-2xl object-cover shadow-md shadow-slate-900/10 ring-2 ring-white"
              />
              <div
                v-else
                class="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-sky-400 text-base font-extrabold text-white shadow-md shadow-brand/25 ring-2 ring-white"
              >
                {{ auth.initials }}
              </div>
              <div class="min-w-0 pt-0.5">
                <div class="flex items-center gap-2">
                  <span class="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand">
                    Яндекс ID
                  </span>
                </div>
                <h2 class="mt-2 text-[15px] font-extrabold tracking-tight text-slate-900">Учётная запись</h2>
                <p class="mt-1 truncate text-sm font-bold text-slate-800">{{ auth.displayName }}</p>
                <p class="truncate text-xs font-medium text-slate-500">{{ auth.user?.email || '—' }}</p>
              </div>
            </div>
            <AppButton variant="secondary" size="sm" class="shrink-0 shadow-sm" @click="logout">
              <LogOut class="size-3.5" />
              Выйти
            </AppButton>
          </div>
        </section>

        <!-- Отображение -->
        <section id="profile-display" class="profile-section-scroll scroll-mt-24 bg-gradient-to-r from-emerald-50/[0.35] via-white to-transparent px-5 py-5 sm:px-6">
          <div class="mb-4 flex items-start gap-3">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100/90 text-emerald-700 shadow-sm ring-1 ring-emerald-200/70"
              aria-hidden="true"
            >
              <Globe class="size-5" />
            </span>
            <div class="min-w-0 pt-0.5">
              <h2 class="text-[15px] font-extrabold tracking-tight text-slate-900">Отображение времени</h2>
              <p class="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                Даты и часы на сайте показываются в вашей зоне.
              </p>
            </div>
          </div>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div class="min-w-0 flex-1 rounded-xl border border-slate-100 bg-white/70 p-3 shadow-inner sm:max-w-md">
              <AppTimezoneSearchSelect
                v-model="timezoneDraft"
                label="Часовой пояс (IANA)"
                hint="Откройте список — внутри есть поиск по названию города или региона."
              />
            </div>
            <div class="flex shrink-0 flex-col gap-2 sm:pt-7">
              <AppButton
                variant="primary"
                size="sm"
                class="min-h-[38px] min-w-[9rem] shadow-sm sm:min-w-[7.5rem]"
                :loading="tzSaving"
                :disabled="timezoneDraftTrimmed === timezoneSavedTrimmed"
                @click="saveTimezone"
              >
                Сохранить
              </AppButton>
              <p
                v-if="timezoneDraftTrimmed !== timezoneSavedTrimmed"
                class="text-[11px] font-semibold text-amber-800"
              >
                Изменения ещё не сохранены
              </p>
            </div>
          </div>
          <p v-if="tzMessage" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 ring-1 ring-rose-100">
            {{ tzMessage }}
          </p>
        </section>

        <!-- TeamCity -->
        <section id="profile-teamcity" class="profile-section-scroll scroll-mt-24 bg-gradient-to-r from-sky-50/[0.4] via-white to-transparent px-5 py-5 sm:px-6">
          <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100/90 text-brand shadow-sm ring-1 ring-sky-200/80"
              >
                <KeyRound class="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 class="text-[15px] font-extrabold tracking-tight text-slate-900">TeamCity</h2>
                <p class="mt-1 max-w-xl text-xs font-medium leading-relaxed text-slate-600">
                  Личный токен: сервер обращается к REST TeamCity при создании OTE и смежных операциях от вашего имени.
                </p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                class="inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ring-1 ring-black/[0.04]"
                :class="
                  tc.tokenSaved
                    ? 'bg-emerald-100 text-emerald-950 ring-emerald-200/60'
                    : 'bg-slate-100 text-slate-600 ring-slate-200/70'
                "
              >
                {{ tc.tokenSaved ? 'Токен сохранён' : 'Токена нет' }}
              </span>
              <span
                v-if="tc.ready"
                class="inline-flex items-center rounded-lg bg-sky-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-950 shadow-sm ring-1 ring-sky-200/70"
              >
                API доступен
              </span>
            </div>
          </div>

          <div class="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border border-slate-100 bg-white/90 px-3.5 py-2.5 font-mono text-[12px] text-slate-800 shadow-inner ring-1 ring-slate-900/[0.03]">
            <span class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Базовый URL</span>
            <span class="font-semibold text-slate-800">{{ tcUiBase }}</span>
          </div>

          <details class="group mb-4 overflow-hidden rounded-xl border border-slate-200/90 bg-white/80 text-sm shadow-sm">
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-2 bg-slate-50/70 px-3.5 py-2.5 font-bold text-slate-800 transition marker:content-none hover:bg-slate-100/80 [&::-webkit-details-marker]:hidden"
            >
              <span>Как получить токен</span>
              <ChevronDown
                class="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div class="border-t border-slate-100 px-3.5 py-3 text-xs font-medium leading-relaxed text-slate-600">
              <ol class="list-decimal space-y-2 pl-4">
                <li>Войдите на <span class="font-mono text-[11px] text-slate-800">{{ tcUiBase }}</span></li>
                <li>В меню пользователя откройте профиль → раздел <strong>Access Tokens</strong>.</li>
                <li>Создайте токен и вставьте значение ниже (в интерфейсе TeamCity его показывают один раз).</li>
              </ol>
              <p class="mt-3 border-t border-slate-100 pt-3">
                <a
                  class="inline-flex items-center gap-1 font-bold text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
                  href="https://www.jetbrains.com/help/teamcity/configuring-your-user-profile.html#Managing+Access+Tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Документация JetBrains</a
                >
              </p>
            </div>
          </details>

          <label class="mb-1.5 block text-xs font-bold text-slate-700" for="tc-token">Новый токен доступа</label>
          <p id="tc-token-hint" class="mb-2 text-[11px] font-medium text-slate-500">Только строка токена, без префикса Bearer.</p>
          <input
            id="tc-token"
            v-model="tokenInput"
            type="password"
            autocomplete="off"
            aria-describedby="tc-token-hint"
            class="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="Вставьте токен из TeamCity"
          />

          <div class="flex flex-wrap gap-2">
            <AppButton variant="primary" size="sm" class="shadow-sm" :loading="saving" :disabled="!tokenInput.trim()" @click="saveToken">
              Сохранить токен
            </AppButton>
            <AppButton variant="secondary" size="sm" :loading="removing" :disabled="!tc.tokenSaved" @click="removeToken">
              Удалить
            </AppButton>
          </div>
          <p v-if="message" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 ring-1 ring-rose-100">
            {{ message }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ChevronDown, Globe, KeyRound, LogOut, UserRound } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import { DEFAULT_USER_TIMEZONE } from '~/constants/user-timezone'
import { fetchInternalApi } from '~/composables/internalApi'
import { useToast } from '~/composables/useToast'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const navLinks = [
  { id: 'profile-account', label: 'Аккаунт', icon: UserRound },
  { id: 'profile-display', label: 'Отображение', icon: Globe },
  { id: 'profile-teamcity', label: 'TeamCity', icon: KeyRound },
]

function scrollTo(sectionId) {
  if (!import.meta.client || typeof document === 'undefined') return
  const el = document.getElementById(sectionId)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const tcUiBase = computed(() => {
  const g = auth.user?.group
  const u = String(g?.tcUiBaseUrl || g?.tcRestBaseUrl || '').replace(/\/+$/, '')
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

const timezoneDraft = ref(DEFAULT_USER_TIMEZONE)
const tzSaving = ref(false)
const tzMessage = ref('')

const timezoneDraftTrimmed = computed(() => String(timezoneDraft.value || '').trim() || DEFAULT_USER_TIMEZONE)
const timezoneSavedTrimmed = computed(() => String(auth.user?.timezone || '').trim() || DEFAULT_USER_TIMEZONE)

watch(
  () => auth.user?.timezone,
  (t) => {
    timezoneDraft.value = typeof t === 'string' && t.trim() ? t.trim() : DEFAULT_USER_TIMEZONE
  },
  { immediate: true },
)

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

async function saveTimezone() {
  tzSaving.value = true
  tzMessage.value = ''
  try {
    const res = await fetchInternalApi('/api/me/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: timezoneDraftTrimmed.value }),
    })
    const errText = await res.text()
    if (!res.ok) {
      const errMsg = errorTextFromResponseBody(errText, res.status)
      tzMessage.value = errMsg
      toast.show(errMsg, 'warn', 5000)
      return
    }
    let data = null
    try {
      data = JSON.parse(errText)
    } catch {
      data = null
    }
    const nextTz = typeof data?.timezone === 'string' && data.timezone.trim() ? data.timezone.trim() : timezoneDraftTrimmed.value
    auth.patchUser({ timezone: nextTz })
    timezoneDraft.value = nextTz
    toast.show('Часовой пояс сохранён', 'success')
  } catch {
    tzMessage.value = 'Ошибка сети'
    toast.show('Ошибка сети', 'warn')
  } finally {
    tzSaving.value = false
  }
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

useHead({ title: 'Профиль · OTE Manager' })
</script>
