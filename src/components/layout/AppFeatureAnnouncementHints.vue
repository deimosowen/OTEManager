<template>
  <div v-if="announcement">
    <AppModal
      v-model="modalOpen"
      labelledby="feature-announcement-title"
      accent="brand"
      max-width-class="max-w-lg"
      :backdrop-dismissible="false"
    >
      <h2 id="feature-announcement-title" class="text-lg font-extrabold tracking-tight text-slate-900">
        {{ announcement.title }}
      </h2>
      <p class="mt-2 text-sm font-medium leading-relaxed text-slate-600">
        {{ announcement.intro }}
      </p>
      <ul
        v-if="announcement.bullets?.length"
        class="mt-4 space-y-2.5 text-sm font-medium leading-relaxed text-slate-700"
      >
        <li v-for="(line, i) in announcement.bullets" :key="i" class="flex gap-2.5">
          <span class="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
          <span>{{ line }}</span>
        </li>
      </ul>
      <div
        class="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-3 sm:gap-y-2"
        role="group"
        aria-label="Действия"
      >
        <AppButton
          type="button"
          variant="ghost"
          size="sm"
          class="min-h-[40px] w-full shrink-0 justify-center sm:min-h-0 sm:w-auto"
          :disabled="persistBusy || tourRunning"
          :loading="persistBusy"
          @click="dismissOnly"
        >
          {{ announcement.tour ? 'Без экскурсии' : 'Понятно' }}
        </AppButton>
        <AppButton
          v-if="announcement.tour"
          type="button"
          variant="primary"
          size="sm"
          class="min-h-[40px] w-full shrink-0 justify-center shadow-sm sm:min-h-0 sm:w-auto"
          :disabled="persistBusy || tourRunning"
          @click="startFeatureTour"
        >
          Пройти экскурсию
        </AppButton>
        <AppButton
          v-else-if="announcement.primaryLink?.to"
          type="button"
          variant="primary"
          size="sm"
          class="min-h-[40px] w-full shrink-0 justify-center shadow-sm sm:min-h-0 sm:w-auto"
          :disabled="persistBusy"
          :loading="persistBusy"
          @click="dismissAndNavigate"
        >
          {{ announcement.primaryLink.label }}
        </AppButton>
      </div>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '~/composables/useToast'
import { fetchInternalApi } from '~/composables/internalApi'
import { runFeatureAnnouncementTour } from '~/tours/feature-announcement/index.js'
import {
  isOnboardingOfferPostponedSession,
  onboardingOfferPostponeRevision,
} from '~/composables/useOteOnboardingTour.js'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const modalOpen = ref(false)
const persistBusy = ref(false)
const tourRunning = ref(false)

const announcement = computed(() => auth.user?.pendingFeatureAnnouncement ?? null)

/**
 * Очередь: сначала онбординг (если пользователю положен), потом анонс.
 * Пока активно приглашение «Пройти знакомство?» без «Позже» — анонс не открываем (включая время тура).
 */
const deferAnnouncementUntilOnboardingResolved = computed(() => {
  void onboardingOfferPostponeRevision.value
  if (!auth.isLoggedIn) return false
  if (auth.isAdmin) return false
  if (!auth.user?.showOnboardingHints) return false
  return !isOnboardingOfferPostponedSession()
})

function tryOpenModal() {
  if (!import.meta.client) return
  if (!auth.isLoggedIn || !announcement.value) {
    modalOpen.value = false
    return
  }
  if (deferAnnouncementUntilOnboardingResolved.value) return
  if (tourRunning.value) return
  modalOpen.value = true
}

onMounted(() => {
  nextTick(() => tryOpenModal())
})

watch(announcement, () => tryOpenModal())
watch(() => auth.isLoggedIn, () => tryOpenModal())
watch(deferAnnouncementUntilOnboardingResolved, () => tryOpenModal())

/**
 * @param {string} [announcementId]
 */
async function persistDismiss(announcementId) {
  const id = announcementId ?? announcement.value?.id
  if (!id) return false
  persistBusy.value = true
  try {
    const res = await fetchInternalApi('/api/me/feature-announcements/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const text = await res.text()
    let pending = null
    if (res.ok) {
      try {
        const j = JSON.parse(text)
        pending = j?.pendingFeatureAnnouncement ?? null
      } catch {
        pending = null
      }
      auth.patchUser({ pendingFeatureAnnouncement: pending })
      return true
    }
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
  } catch {
    toast.show('Ошибка сети', 'warn')
    return false
  } finally {
    persistBusy.value = false
  }
}

async function dismissOnly() {
  const ok = await persistDismiss()
  if (ok) modalOpen.value = false
}

async function dismissAndNavigate() {
  const to = announcement.value?.primaryLink?.to
  const ok = await persistDismiss()
  if (ok) {
    modalOpen.value = false
    if (to) await router.push(to)
  }
}

async function startFeatureTour() {
  const tour = announcement.value?.tour
  const id = announcement.value?.id
  if (!tour || !id || typeof tour !== 'string') return
  modalOpen.value = false
  tourRunning.value = true
  await nextTick()
  await new Promise((r) => requestAnimationFrame(r))
  runFeatureAnnouncementTour(router, tour, {
    async onTourEnded() {
      tourRunning.value = false
      await persistDismiss(id)
    },
  })
}
</script>
