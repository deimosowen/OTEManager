<template>
  <div class="mx-auto max-w-lg px-4 py-10 sm:py-14">
    <div
      class="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card-md ring-1 ring-slate-900/[0.04]"
    >
      <div class="h-1.5 bg-gradient-to-r from-teal-500 via-brand to-violet-500" aria-hidden="true" />

      <div class="px-6 py-8 sm:px-8 sm:py-10">
        <div class="flex flex-col items-center text-center">
          <div
            class="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-sky-100 text-teal-800 shadow-inner ring-1 ring-teal-200/80"
            aria-hidden="true"
          >
            <Users class="size-8" :stroke-width="2" />
          </div>
          <h1 class="mt-5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-[22px]">Приглашение в группу</h1>
          <p v-if="loading" class="mt-6 text-sm font-semibold text-slate-500">Проверяем ссылку…</p>
        </div>

        <template v-if="!loading">
          <!-- Ошибка -->
          <div v-if="preview && !preview.ok" class="mt-6 space-y-4 text-center">
            <p class="text-sm font-semibold leading-relaxed text-slate-700">{{ preview.message }}</p>
            <NuxtLink
              to="/"
              class="inline-flex rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-extrabold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              На главную
            </NuxtLink>
          </div>

          <!-- Уже в группе -->
          <div v-else-if="preview?.ok && preview.alreadyMember" class="mt-6 space-y-5 text-center">
            <p class="text-lg font-extrabold text-slate-900">«{{ preview.groupName }}»</p>
            <p class="text-sm font-semibold leading-relaxed text-slate-600">Вы уже состоите в этой группе каталога. Можете закрыть эту страницу.</p>
            <button
              type="button"
              class="mx-auto rounded-xl bg-slate-100 px-6 py-2.5 text-sm font-extrabold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
              :disabled="busy"
              @click="goHomeAfterDecline"
            >
              На главную
            </button>
          </div>

          <!-- Подтверждение -->
          <div v-else-if="preview?.ok" class="mt-7 space-y-6">
            <div class="rounded-xl border border-slate-100 bg-slate-50/90 px-4 py-4 text-center">
              <p class="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Группа</p>
              <p class="mt-1 text-lg font-extrabold leading-snug text-slate-900">{{ preview.groupName }}</p>
              <p class="mt-3 border-t border-slate-200/80 pt-3 text-xs font-semibold text-slate-500">
                Срок действия ссылки —
                <span class="font-mono font-bold text-slate-700">{{ formatExpires(preview.expiresAt) }}</span>
              </p>
            </div>

            <p class="text-center text-xs font-semibold leading-relaxed text-slate-500">
              Нажимая «Принять», вы перейдёте в эту группу каталога (настройки TeamCity и каталог виртуальных машин будут связаны с ней).
            </p>

            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <AppButton variant="ghost" class="order-3 font-extrabold sm:order-1" :disabled="busy" @click="onDecline">
                Отказаться
              </AppButton>
              <AppButton
                variant="primary"
                class="order-1 min-h-[44px] flex-1 font-extrabold shadow-md sm:order-2 sm:flex-none sm:px-10"
                :loading="busy && actionKind === 'accept'"
                :disabled="busy && actionKind !== 'accept'"
                @click="onAccept"
              >
                Принять приглашение
              </AppButton>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Users } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useUserTimeFormat } from '~/composables/useUserTimeFormat'

definePageMeta({})

const toast = useToast()
const router = useRouter()
const { formatDateTimeSeconds } = useUserTimeFormat()

/** @typedef {{ ok?: boolean, code?: string, message?: string, groupName?: string, expiresAt?: string, alreadyMember?: boolean }} InvitePreview */

const loading = ref(true)
const busy = ref(false)
/** @type {import('vue').Ref<InvitePreview | null>} */
const preview = ref(null)
/** @type {import('vue').Ref<'accept' | 'decline' | ''>} */
const actionKind = ref('')

function formatExpires(iso) {
  if (!iso) return '—'
  try {
    return formatDateTimeSeconds(iso)
  } catch {
    return String(iso)
  }
}

async function loadPreview() {
  loading.value = true
  try {
    const res = await $fetch('/api/auth/invite/preview', { credentials: 'include' })
    preview.value = res && typeof res === 'object' ? res : { ok: false, message: 'Не удалось загрузить приглашение' }
  } catch {
    preview.value = { ok: false, message: 'Ошибка сети. Попробуйте обновить страницу или открыть исходную ссылку снова.' }
  } finally {
    loading.value = false
  }
}

async function onAccept() {
  busy.value = true
  actionKind.value = 'accept'
  try {
    const res = await $fetch('/api/auth/invite/accept', { method: 'POST', credentials: 'include' })
    if (res?.kind === 'noop_same_group') {
      toast.show('Эта группа у вас уже назначена.', 'success')
    } else {
      toast.show('Вы вступили в группу по приглашению.', 'success')
    }
    await router.replace('/')
  } catch (e) {
    toast.show(e?.data?.message || e?.message || String(e), 'error')
  } finally {
    busy.value = false
    actionKind.value = ''
  }
}

async function onDecline() {
  busy.value = true
  actionKind.value = 'decline'
  try {
    await $fetch('/api/auth/invite/decline', { method: 'POST', credentials: 'include' })
    toast.show('Приглашение отменено.', 'success')
    await router.replace('/')
  } catch {
    await router.replace('/')
  } finally {
    busy.value = false
    actionKind.value = ''
  }
}

async function goHomeAfterDecline() {
  busy.value = true
  try {
    await $fetch('/api/auth/invite/decline', { method: 'POST', credentials: 'include' })
  } catch {
    /* cookie мог уже отсутствовать */
  } finally {
    busy.value = false
    await router.replace('/')
  }
}

onMounted(() => {
  void loadPreview()
})

useHead({ title: 'Приглашение в группу · OTE Manager' })
</script>
