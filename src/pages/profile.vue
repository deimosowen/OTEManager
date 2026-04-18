<template>
  <div>
    <h1 class="mb-2 text-[22px] font-extrabold text-slate-900">Профиль</h1>
    <p class="mb-6 max-w-2xl text-sm text-slate-600">
      Данные профиля приходят из Яндекс ID после OAuth. Дополнительные настройки аккаунта можно добавить позже.
    </p>
    <div class="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <div class="mb-3 text-sm font-bold text-slate-500">Имя</div>
      <div class="mb-5 text-base font-extrabold text-slate-900">{{ auth.displayName }}</div>
      <div class="mb-3 text-sm font-bold text-slate-500">Email</div>
      <div class="mb-6 text-base font-semibold text-slate-800">{{ auth.user?.email || '—' }}</div>
      <AppButton variant="secondary" @click="logout">Выйти</AppButton>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  await router.push('/login')
}
</script>
