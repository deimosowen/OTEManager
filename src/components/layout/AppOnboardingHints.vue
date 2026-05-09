<template>
  <div v-if="eligible">
    <AppModal
      v-model="offerOpen"
      labelledby="onboarding-offer-title"
      accent="brand"
      max-width-class="max-w-lg"
      :backdrop-dismissible="false"
    >
      <h2 id="onboarding-offer-title" class="text-lg font-extrabold tracking-tight text-slate-900">Пройти знакомство?</h2>
      <p class="mt-2 text-sm font-medium leading-relaxed text-slate-600">
        Короткая экскурсия: окружения, мастер создания OTE, затем блок TeamCity в профиле и уведомления. Отдельно покажем, где указать доступ к TC: без сохранённого
        <span class="font-bold text-slate-800">токена</span>
        сборки через интерфейс не уйдут. Шаги — кнопками «Назад» и «Далее».
      </p>
      <div
        class="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-3 sm:gap-y-2"
        role="group"
        aria-label="Действия приглашения"
      >
        <AppButton
          type="button"
          variant="ghost"
          size="sm"
          class="min-h-[40px] w-full shrink-0 justify-center sm:min-h-0 sm:w-auto"
          :disabled="persistBusy"
          :loading="persistBusy"
          @click="skipForever"
        >
          Не показывать
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          class="min-h-[40px] w-full shrink-0 justify-center sm:min-h-0 sm:w-auto"
          :disabled="persistBusy"
          @click="postponeOffer"
        >
          Позже
        </AppButton>
        <AppButton
          type="button"
          variant="primary"
          class="min-h-[40px] w-full shrink-0 justify-center shadow-sm sm:min-h-0 sm:w-auto"
          :disabled="persistBusy"
          @click="startTour"
        >
          Пройти знакомство
        </AppButton>
      </div>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '~/composables/useToast'
import { fetchInternalApi } from '~/composables/internalApi'
import {
  isOnboardingOfferPostponedSession,
  postponeOnboardingOfferForSession,
  runOteOnboardingTour,
} from '~/composables/useOteOnboardingTour.js'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const offerOpen = ref(false)
const persistBusy = ref(false)

const eligible = computed(
  () => Boolean(auth.isLoggedIn && auth.user?.showOnboardingHints === true && !auth.isAdmin),
)

onMounted(() => {
  if (!import.meta.client) return
  if (!eligible.value) return
  if (isOnboardingOfferPostponedSession()) return
  offerOpen.value = true
})

watch(eligible, (ok) => {
  if (!ok) offerOpen.value = false
})

async function persistDismiss() {
  persistBusy.value = true
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
      return false
    }
    auth.patchUser({ showOnboardingHints: false })
    return true
  } catch {
    toast.show('Ошибка сети', 'warn')
    return false
  } finally {
    persistBusy.value = false
  }
}

function startTour() {
  offerOpen.value = false
  runOteOnboardingTour(router, {
    async onTourFinished() {
      await persistDismiss()
    },
  })
}

function postponeOffer() {
  postponeOnboardingOfferForSession()
  offerOpen.value = false
}

async function skipForever() {
  const ok = await persistDismiss()
  if (ok) offerOpen.value = false
}
</script>
