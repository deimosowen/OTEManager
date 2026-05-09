<template>
  <aside
    v-if="visible"
    aria-labelledby="onboarding-hints-title"
    class="fixed bottom-4 left-4 right-4 z-sheet max-h-[min(72vh,calc(100dvh-6rem))] overflow-y-auto rounded-2xl border border-slate-200/95 bg-white/98 p-4 shadow-xl shadow-slate-900/10 backdrop-blur-sm ring-1 ring-slate-900/5 sm:p-5 md:right-6 md:left-auto md:max-w-md"
  >
    <div class="h-1 shrink-0 rounded-full bg-gradient-to-r from-brand via-sky-500 to-sky-400" aria-hidden="true" />
    <div class="mt-3 flex items-start justify-between gap-3">
      <div class="flex items-start gap-2.5">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand ring-1 ring-brand/15">
          <Sparkles class="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 id="onboarding-hints-title" class="text-sm font-extrabold tracking-tight text-slate-900">Первые шаги в OTE Manager</h2>
          <p class="mt-1 text-xs font-medium leading-relaxed text-slate-600">
            Коротко, куда нажать. Подсказка только для новых участников каталога; можно скрыть в любой момент.
          </p>
        </div>
      </div>
    </div>

    <ul class="mt-4 space-y-2.5 text-xs font-semibold text-slate-700">
      <li class="flex gap-2">
        <span class="font-mono font-bold text-brand">1.</span>
        <span>
          <NuxtLink to="/" class="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">Главная</NuxtLink>
          — обзор и быстрые действия.
        </span>
      </li>
      <li class="flex gap-2">
        <span class="font-mono font-bold text-brand">2.</span>
        <span>
          <NuxtLink
            to="/environments"
            class="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
          >
            Окружения OTE
          </NuxtLink>
          — список, фильтры и карточка стенда.
        </span>
      </li>
      <li class="flex gap-2">
        <span class="font-mono font-bold text-brand">3.</span>
        <span>
          <NuxtLink
            to="/create"
            class="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
          >
            Создать OTE
          </NuxtLink>
          —
          <NuxtLink
            to="/templates"
            class="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
          >
            Шаблоны
          </NuxtLink>
          ускоряют повторные запуски.
        </span>
      </li>
      <li class="flex gap-2">
        <span class="font-mono font-bold text-brand">4.</span>
        <span> В меню слева раздел «Быстрый запуск»: избранные и недавние шаблоны сборки.</span>
      </li>
      <li v-if="auth.isAdmin" class="flex gap-2">
        <span class="font-mono font-bold text-brand">5.</span>
        <span>
          Для администраторов:
          <NuxtLink to="/audit" class="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">Аудит</NuxtLink>
          ,
          <NuxtLink
            to="/admin/users"
            class="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
          >
            Пользователи
          </NuxtLink>
          .
        </span>
      </li>
    </ul>

    <div class="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
      <AppButton type="button" variant="primary" size="sm" class="shadow-sm" :loading="busy" @click="dismiss">
        Понятно, скрыть
      </AppButton>
      <span class="text-[11px] font-medium text-slate-500">Подсказка не вернётся после скрытия.</span>
    </div>
  </aside>
</template>

<script setup>
import { Sparkles } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useToast } from '~/composables/useToast'
import { fetchInternalApi } from '~/composables/internalApi'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const toast = useToast()
const busy = ref(false)

const visible = computed(() => Boolean(auth.isLoggedIn && auth.user?.showOnboardingHints))

async function dismiss() {
  if (busy.value) return
  busy.value = true
  try {
    const res = await fetchInternalApi('/api/me/onboarding-hints/dismiss', { method: 'POST' })
    const text = await res.text()
    if (!res.ok) {
      let msg = `Ошибка ${res.status}`
      try {
        const j = JSON.parse(text)
        if (j && typeof j.message === 'string' && j.message.trim()) msg = j.message.trim()
      } catch {
        const raw = String(text || '').trim()
        if (raw) msg = raw.length > 240 ? `${raw.slice(0, 240)}…` : raw
      }
      toast.show(msg, 'warn')
      return
    }
    auth.patchUser({ showOnboardingHints: false })
  } catch {
    toast.show('Ошибка сети', 'warn')
  } finally {
    busy.value = false
  }
}
</script>
