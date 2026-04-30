<template>
  <div v-if="auth.isLoggedIn" ref="rootRef" class="relative z-[110] flex items-center">
    <button
      type="button"
      class="relative flex size-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-brand-light hover:text-brand"
      aria-label="Уведомления"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggleOpen"
    >
      <Bell class="size-[22px] shrink-0" aria-hidden="true" />
      <span
        v-if="store.unreadCount > 0"
        class="absolute right-1 top-1 flex min-w-[1.125rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-white"
      >
        {{ store.unreadCount > 99 ? '99+' : store.unreadCount }}
      </span>
    </button>

    <Teleport to="body">
      <!-- Затемнение только на мобилке. Не оборачивать панель в родителя с transform — иначе sm:fixed «прилипает» к этому родителю и визуально прыгает после анимации. -->
      <div
        v-if="open"
        class="fixed inset-0 z-[500] bg-slate-900/25 sm:hidden"
        aria-hidden="true"
        @click="open = false"
      />
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 max-sm:translate-y-2"
        enter-to-class="opacity-100 max-sm:translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 max-sm:translate-y-0"
        leave-to-class="opacity-0 max-sm:translate-y-2"
      >
        <div
          v-if="open"
          data-app-notifications-panel
          class="fixed bottom-0 left-0 right-0 z-[510] flex max-h-[min(82vh,calc(100vh-6rem))] flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 sm:bottom-auto sm:left-auto sm:right-5 sm:top-16 sm:max-h-[min(72vh,28rem)] sm:w-[min(calc(100vw-2.5rem),22rem)] sm:rounded-2xl"
        >
            <div class="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
              <p class="text-sm font-extrabold text-slate-900">Уведомления</p>
              <div class="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  class="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                  :disabled="!store.items.length || store.unreadCount === 0"
                  @click="onMarkAllRead"
                >
                  Все прочитаны
                </button>
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Закрыть"
                  @click="open = false"
                >
                  <X class="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3">
              <p v-if="store.loading && !store.items.length" class="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                Загрузка…
              </p>
              <p v-else-if="!store.items.length" class="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                Пока нет уведомлений. Здесь появятся итоги создания OTE через TeamCity.
              </p>
              <ul v-else class="space-y-1.5">
                <li
                  v-for="n in store.items"
                  :key="n.id"
                  class="group rounded-xl border border-slate-100 bg-slate-50/70 transition hover:bg-white hover:shadow-sm"
                  :class="{
                    'border-brand/20 bg-brand-light/25 ring-1 ring-brand/10': !n.readAt,
                  }"
                >
                  <div class="flex gap-2 p-3">
                    <div class="min-w-0 flex-1">
                      <NuxtLink
                        :to="n.href"
                        class="block"
                        @click="onNavigate(n)"
                      >
                        <span
                          class="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
                          :class="pillClass(n.kind)"
                        >
                          {{ n.kind === APP_NOTIFICATION_KIND.OTE_CREATE_SUCCEEDED ? 'Готово' : 'Ошибка' }}
                        </span>
                        <p class="mt-1.5 text-sm font-extrabold leading-snug text-slate-900">{{ n.title }}</p>
                        <p v-if="n.body" class="mt-0.5 line-clamp-3 text-xs font-medium leading-relaxed text-slate-600">
                          {{ n.body }}
                        </p>
                        <p class="mt-2 text-[11px] font-bold text-brand underline decoration-brand/30 underline-offset-2">
                          Открыть запрос · логи TeamCity
                        </p>
                      </NuxtLink>
                    </div>
                    <button
                      type="button"
                      class="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-70 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                      title="Удалить"
                      @click.prevent.stop="onDelete(n)"
                    >
                      <Trash2 class="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              </ul>
            </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { Bell, Trash2, X } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { APP_NOTIFICATION_KIND } from '~/constants/notifications'
import { useAppNotificationsStream } from '~/composables/useAppNotificationsStream'
import { useAppNotificationsStore } from '~/stores/app-notifications'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'

const auth = useAuthStore()
const store = useAppNotificationsStore()
const toast = useToast()

useAppNotificationsStream()

const open = ref(false)
const rootRef = ref(null)

function pillClass(kind) {
  if (kind === APP_NOTIFICATION_KIND.OTE_CREATE_SUCCEEDED) return 'bg-emerald-100 text-emerald-900'
  return 'bg-rose-100 text-rose-950'
}

function toggleOpen() {
  open.value = !open.value
}

watch(open, (v) => {
  if (v) void store.fetchList()
})

watch(
  () => auth.isLoggedIn,
  (v) => {
    if (!v) open.value = false
  },
)

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown, true)
})

function onDocMouseDown(ev) {
  if (!open.value) return
  const t = ev.target
  if (!(t instanceof Element)) return
  if (rootRef.value?.contains(t)) return
  if (t.closest('[data-app-notifications-panel]')) return
  open.value = false
}

async function onNavigate(n) {
  if (!n.readAt) await store.markRead(n.id)
  open.value = false
}

async function onDelete(n) {
  const ok = await store.deleteOne(n.id)
  if (!ok) toast.show('Не удалось удалить уведомление', 'warn')
}

async function onMarkAllRead() {
  const ok = await store.markAllRead()
  if (!ok) toast.show('Не удалось сохранить', 'warn')
}
</script>
