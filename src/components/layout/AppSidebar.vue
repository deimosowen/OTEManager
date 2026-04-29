<template>
  <aside
    class="flex w-[200px] shrink-0 flex-col gap-1 border-r border-slate-200 bg-white px-3 py-4"
    :style="{ minHeight: 'calc(100vh - 3.5rem)' }"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-brand-light hover:text-brand"
      :class="isActive(item) ? '!bg-brand !text-white' : ''"
    >
      <component :is="item.icon" class="size-[18px] shrink-0" />
      {{ item.label }}
    </NuxtLink>

    <div v-if="quickLaunchItems.length" class="mt-4 border-t border-slate-200 pt-4">
      <p class="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Быстрый запуск</p>
      <div class="flex flex-col gap-0.5">
        <NuxtLink
          v-for="q in quickLaunchItems"
          :key="`ql-${q.id}`"
          :to="`/create?template=${encodeURIComponent(String(q.id))}`"
          class="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-brand-light hover:text-brand"
          :class="isQuickLaunchActive(q.id) ? 'bg-brand-light/60 text-brand' : ''"
        >
          <Star v-if="q.kind === 'fav'" class="size-3.5 shrink-0 fill-amber-400 text-amber-500" aria-hidden="true" />
          <Clock v-else class="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span class="min-w-0 truncate leading-snug">{{ q.name }}</span>
        </NuxtLink>
      </div>
    </div>
  </aside>
</template>

<script setup>
import {
  Activity,
  CirclePlus,
  Clock,
  FileStack,
  Home,
  Info,
  LayoutGrid,
  ScrollText,
  Star,
  UserRound,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useOteTemplateShortcuts } from '~/composables/useOteTemplateShortcuts.js'

const route = useRoute()
const { favoriteIds, loadShortcuts, orderedRecentIds } = useOteTemplateShortcuts()
const buildTemplates = ref(/** @type {any[]} */ ([]))

const quickLaunchItems = computed(() => {
  const map = new Map(buildTemplates.value.map((t) => [String(t.id), t]))
  const favSet = new Set(favoriteIds.value.map(String))
  /** @type {{ id: string | number, name: string, kind: 'fav' | 'recent' }[]} */
  const out = []
  for (const id of favoriteIds.value) {
    const t = map.get(String(id))
    if (t) out.push({ id: t.id, name: String(t.name || `#${t.id}`), kind: 'fav' })
  }
  for (const id of orderedRecentIds()) {
    if (favSet.has(String(id))) continue
    const t = map.get(String(id))
    if (t) out.push({ id: t.id, name: String(t.name || `#${t.id}`), kind: 'recent' })
  }
  return out.slice(0, 10)
})

function isQuickLaunchActive(id) {
  if (!route.path.startsWith('/create')) return false
  const q = route.query.template
  const raw = Array.isArray(q) ? q[0] : q
  return raw != null && String(raw) === String(id)
}

onMounted(async () => {
  const [, res] = await Promise.all([
    loadShortcuts().catch(() => {}),
    $fetch('/api/ote/build-templates', { credentials: 'include' }).catch(() => null),
  ])
  buildTemplates.value = Array.isArray(res?.templates) ? res.templates : []
})

const items = [
  { to: '/', label: 'Главная', icon: Home, match: 'home' },
  { to: '/environments', label: 'Окружения OTE', icon: LayoutGrid, match: 'environments' },
  { to: '/create', label: 'Создать OTE', icon: CirclePlus, match: 'create' },
  { to: '/templates', label: 'Шаблоны', icon: FileStack, match: 'templates' },
  { to: '/audit', label: 'Аудит', icon: ScrollText, match: 'audit' },
  { to: '/admin/health', label: 'Состояние', icon: Activity, match: 'admin' },
  { to: '/profile', label: 'Профиль', icon: UserRound, match: 'exact' },
  { to: '/about', label: 'О проекте', icon: Info, match: 'about' },
]

function isActive(item) {
  if (item.match === 'exact') return route.path === item.to
  if (item.match === 'home') return route.path === '/'
  if (item.match === 'create') return route.path.startsWith('/create')
  if (item.match === 'about') return route.path.startsWith('/about')
  if (item.match === 'templates') return route.path.startsWith('/templates')
  if (item.match === 'audit') return route.path.startsWith('/audit')
  if (item.match === 'admin') return route.path.startsWith('/admin')
  if (item.match === 'environments') {
    return route.path === '/environments' || route.path.startsWith('/environments/')
  }
  return false
}
</script>
