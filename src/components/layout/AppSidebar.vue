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
  </aside>
</template>

<script setup>
import { Activity, FileStack, LayoutGrid, ScrollText, UserRound } from 'lucide-vue-next'

const route = useRoute()

const items = [
  { to: '/', label: 'Окружения OTE', icon: LayoutGrid, match: 'mvp' },
  { to: '/templates', label: 'Шаблоны', icon: FileStack, match: 'templates' },
  { to: '/audit', label: 'Аудит', icon: ScrollText, match: 'audit' },
  { to: '/admin/health', label: 'Состояние', icon: Activity, match: 'admin' },
  { to: '/profile', label: 'Профиль', icon: UserRound, match: 'exact' },
]

function isActive(item) {
  if (item.match === 'exact') return route.path === item.to
  if (item.match === 'templates') return route.path.startsWith('/templates')
  if (item.match === 'audit') return route.path.startsWith('/audit')
  if (item.match === 'admin') return route.path.startsWith('/admin')
  if (item.match === 'mvp') {
    return (
      route.path === '/' ||
      route.path.startsWith('/create') ||
      route.path.startsWith('/environments/')
    )
  }
  return false
}
</script>
