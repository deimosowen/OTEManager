<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a56c4] via-brand to-sky-400 px-4"
  >
    <div class="pointer-events-none absolute inset-0 opacity-90" aria-hidden="true">
      <svg class="h-full w-full" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <g class="animate-drift">
          <ellipse cx="200" cy="720" rx="180" ry="60" fill="rgba(255,255,255,0.12)" />
          <ellipse cx="160" cy="700" rx="100" ry="50" fill="rgba(255,255,255,0.1)" />
        </g>
        <g class="animate-drift-slow">
          <ellipse cx="1200" cy="200" rx="200" ry="65" fill="rgba(255,255,255,0.1)" />
          <ellipse cx="1150" cy="180" rx="120" ry="55" fill="rgba(255,255,255,0.08)" />
        </g>
        <g class="animate-drift-fast">
          <ellipse cx="900" cy="800" rx="240" ry="70" fill="rgba(255,255,255,0.08)" />
        </g>
      </svg>
    </div>

    <div
      class="relative z-[1] w-full max-w-[380px] rounded-2xl border border-white/25 bg-white/10 p-12 text-center shadow-2xl backdrop-blur-xl"
    >
      <div class="mb-6 flex items-center justify-center gap-2.5">
        <AppLogoMark :size="44" />
        <span class="text-[22px] font-extrabold tracking-tight text-white">OTE Manager</span>
      </div>
      <p class="mb-9 text-base font-medium text-white/90">Вход в OTE Manager</p>
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2.5 rounded-lg bg-white py-3.5 text-[15px] font-bold text-slate-800 shadow-md transition hover:-translate-y-px hover:shadow-lg"
        @click="onLogin"
      >
        <span class="inline-flex size-[22px] items-center justify-center rounded-full bg-[#FC3F1D] text-[11px] font-black text-white">Я</span>
        Войти через Яндекс
      </button>
      <p class="mt-6 text-xs text-white/70">
        Сейчас это демо-вход: позже сюда подключается OAuth Яндекса на бэкенде.
      </p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

function onLogin() {
  auth.loginWithYandexMock()
  toast.show('Добро пожаловать!', 'success')
  router.push('/')
}
</script>
