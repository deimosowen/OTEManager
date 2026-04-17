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
import { LayoutGrid, UserRound } from 'lucide-vue-next'

const route = useRoute()

const items = [
  { to: '/', label: 'Окружения OTE', icon: LayoutGrid, match: 'prefix' },
  { to: '/profile', label: 'Профиль', icon: UserRound, match: 'exact' },
]

function isActive(item) {
  if (item.match === 'exact') return route.path === item.to
  return route.path === '/' || route.path.startsWith('/create') || route.path.startsWith('/environments/')
}
</script>
