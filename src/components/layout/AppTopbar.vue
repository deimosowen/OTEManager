<template>
  <header
    class="sticky top-0 z-[100] flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-6 shadow-sm shadow-brand/5"
  >
    <NuxtLink to="/" class="flex items-center gap-2">
      <AppLogoMark :muted="true" />
      <span class="text-base font-extrabold text-brand">OTE Manager</span>
    </NuxtLink>
    <div class="flex-1" />
    <AppNotificationsBell />
    <NuxtLink
      to="/profile"
      class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-800 transition hover:bg-brand-light"
    >
      <img
        v-if="auth.user?.avatarUrl"
        :src="auth.user.avatarUrl"
        alt=""
        class="size-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
      />
      <span
        v-else
        class="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-sky-400 text-xs font-bold text-white"
      >
        {{ auth.initials }}
      </span>
      <span class="max-w-[140px] truncate">{{ auth.displayName }}</span>
      <ChevronDown class="size-3.5 text-slate-500" />
    </NuxtLink>
  </header>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
</script>
