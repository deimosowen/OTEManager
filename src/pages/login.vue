<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0c1a3a] px-4 py-12 sm:px-6"
  >
    <!-- темнее ночное небо, низ чуть светлее без «белой полки» -->
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a1632] via-[#132a5c] to-[#2d5590]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_110%_65%_at_50%_-12%,rgba(147,197,253,0.08),transparent_52%)]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_50%_at_50%_102%,rgba(30,58,120,0.35),transparent_42%)]"
      aria-hidden="true"
    />
    <!-- переливающийся слой (индиго / циан, очень мягко) -->
    <div
      class="pointer-events-none absolute inset-0 animate-sky-shimmer mix-blend-soft-light bg-[radial-gradient(ellipse_55%_40%_at_18%_22%,rgba(129,140,248,0.18),transparent_62%),radial-gradient(ellipse_50%_38%_at_82%_28%,rgba(34,211,238,0.14),transparent_58%),radial-gradient(ellipse_45%_35%_at_48%_55%,rgba(59,130,246,0.12),transparent_55%)]"
      aria-hidden="true"
    />

    <!-- сетка + блик + виньетка -->
    <svg
      class="pointer-events-none absolute inset-0 h-full w-full mix-blend-overlay"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="login-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M 56 0 L 0 0 0 56" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="0.6" />
          <circle cx="0" cy="0" r="0.9" fill="rgba(255,255,255,0.12)" />
        </pattern>
        <radialGradient id="login-vignette" cx="50%" cy="48%" r="82%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.05)" />
          <stop offset="55%" stop-color="rgba(255,255,255,0.01)" />
          <stop offset="100%" stop-color="rgba(5,12,32,0.45)" />
        </radialGradient>
        <radialGradient id="login-sheen" cx="50%" cy="16%" r="72%" fx="50%" fy="10%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.05)" />
          <stop offset="48%" stop-color="rgba(255,255,255,0.015)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#login-grid)" class="animate-grid-pan opacity-35" />
      <rect width="100%" height="100%" fill="url(#login-vignette)" />
      <rect width="100%" height="100%" fill="url(#login-sheen)" />
    </svg>

    <!-- облака: многослойные кучевые силуэты + шапки + лёгкий шум по краю (без кругов SVG) -->
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg class="h-full w-full" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="login-cloud-fill-back" x1="0" y1="920" x2="0" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="rgba(252,254,255,0.5)" />
            <stop offset="42%" stop-color="rgba(210,232,255,0.26)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0.06)" />
          </linearGradient>
          <linearGradient id="login-cloud-fill-mid" x1="0" y1="920" x2="0" y2="540" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="rgba(255,255,255,0.58)" />
            <stop offset="38%" stop-color="rgba(236,248,255,0.34)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0.08)" />
          </linearGradient>
          <linearGradient id="login-cloud-fill-front" x1="0" y1="920" x2="0" y2="560" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="rgba(255,255,255,0.72)" />
            <stop offset="34%" stop-color="rgba(248,252,255,0.42)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0.1)" />
          </linearGradient>
          <linearGradient id="login-cloud-fill-puff" x1="0" y1="900" x2="0" y2="620" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="rgba(255,255,255,0.5)" />
            <stop offset="55%" stop-color="rgba(255,255,255,0.18)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0.04)" />
          </linearGradient>
          <linearGradient id="login-cloud-rim-lit" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%" stop-color="rgba(255,255,255,0)" />
            <stop offset="35%" stop-color="rgba(255,255,255,0.22)" />
            <stop offset="70%" stop-color="rgba(255,255,255,0.06)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </linearGradient>
          <radialGradient id="login-cloud-glow-a" cx="24%" cy="76%" r="48%" gradientUnits="objectBoundingBox">
            <stop offset="0%" stop-color="rgba(255,255,255,0.28)" />
            <stop offset="70%" stop-color="rgba(255,255,255,0.06)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id="login-cloud-glow-b" cx="52%" cy="70%" r="52%" gradientUnits="objectBoundingBox">
            <stop offset="0%" stop-color="rgba(255,255,255,0.22)" />
            <stop offset="65%" stop-color="rgba(255,255,255,0.05)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id="login-cloud-glow-c" cx="78%" cy="74%" r="48%" gradientUnits="objectBoundingBox">
            <stop offset="0%" stop-color="rgba(255,255,255,0.2)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="login-cloud-blur" x="-10%" y="-12%" width="120%" height="124%" color-interpolation-filters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5.2" />
          </filter>
          <!-- мягкий шум: ниже частота/сила смещения + лёгкое размытие после — меньше «угловатости» -->
          <filter id="login-cloud-organic" x="-8%" y="-10%" width="116%" height="120%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="11" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" result="disp" />
            <feGaussianBlur in="disp" stdDeviation="1.35" />
          </filter>
          <filter id="login-cloud-organic-soft" x="-6%" y="-8%" width="112%" height="116%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="31" result="n2" />
            <feDisplacementMap in="SourceGraphic" in2="n2" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d2" />
            <feGaussianBlur in="d2" stdDeviation="0.95" />
          </filter>
        </defs>

        <g class="will-change-transform animate-drift [transform-origin:bottom_center]">
          <!-- дальний пласт: шире, выше, сильнее размытие -->
          <path
            filter="url(#login-cloud-blur)"
            fill="url(#login-cloud-fill-back)"
            opacity="0.62"
            d="M -380 920 L -380 738
              C -255 668 -95 628 55 678 C 205 638 355 668 505 712
              C 655 658 805 682 955 722 C 1105 668 1255 692 1405 732
              C 1555 678 1705 698 1855 728 C 1985 698 2115 718 2200 752
              L 2200 920 Z"
          />
          <path
            filter="url(#login-cloud-blur)"
            fill="rgba(230,242,255,0.2)"
            opacity="0.55"
            d="M -320 920 L -320 772
              C -175 702 5 658 165 698 C 325 652 485 678 645 718
              C 805 668 965 688 1125 728 C 1285 678 1445 698 1605 732
              C 1765 708 1925 722 2085 758 L 2100 920 Z"
          />

          <!-- средний массив: плотная «капустная» линия горизонта -->
          <g filter="url(#login-cloud-organic)" opacity="0.92">
            <path
              fill="url(#login-cloud-fill-mid)"
              opacity="0.52"
              d="M -300 920 L -300 778
                C -145 698 35 658 195 702 C 355 658 515 688 675 732
                C 835 678 995 702 1155 742 C 1315 692 1475 718 1635 758
                C 1795 728 1955 738 2045 772 L 2080 920 Z"
            />
          </g>

          <!-- отдельные кучевые шапки (асимметричные контуры, не окружности) -->
          <g filter="url(#login-cloud-organic-soft)" opacity="0.88">
            <path fill="url(#login-cloud-fill-puff)" opacity="0.44" d="M -55 920 L -55 868 C 5 785 105 712 218 752 C 298 788 332 862 278 898 L 398 920 Z" />
            <path fill="url(#login-cloud-fill-puff)" opacity="0.38" d="M 155 920 L 155 882 C 228 792 368 732 488 768 C 572 802 592 878 528 902 L 638 920 Z" />
            <path fill="url(#login-cloud-fill-puff)" opacity="0.42" d="M 385 920 L 385 852 C 472 762 622 708 752 752 C 842 792 862 872 798 902 L 918 920 Z" />
            <path fill="url(#login-cloud-fill-puff)" opacity="0.36" d="M 605 920 L 605 862 C 688 772 838 722 968 765 C 1058 805 1078 885 1008 908 L 1138 920 Z" />
            <path fill="url(#login-cloud-fill-puff)" opacity="0.4" d="M 835 920 L 835 842 C 928 748 1088 698 1222 748 C 1318 792 1335 878 1262 902 L 1405 920 Z" />
            <path fill="url(#login-cloud-fill-puff)" opacity="0.35" d="M 1045 920 L 1045 868 C 1128 775 1282 728 1412 772 C 1505 812 1522 895 1445 908 L 1595 920 Z" />
            <path fill="url(#login-cloud-fill-puff)" opacity="0.37" d="M 1235 920 L 1235 852 C 1325 762 1495 712 1632 758 C 1725 802 1742 888 1668 905 L 1795 920 Z" />
          </g>

          <!-- передний слой: мелкая зубчатость + подсветка объёма -->
          <g filter="url(#login-cloud-organic)" opacity="0.95">
            <path
              fill="url(#login-cloud-fill-front)"
              opacity="0.44"
              d="M -220 920 L -220 812
                C -78 728 108 692 248 738 C 398 688 548 718 698 762
                C 848 718 998 738 1148 778 C 1298 742 1448 762 1588 798
                C 1728 768 1868 782 1995 812 L 2060 920 Z"
            />
            <path
              fill="url(#login-cloud-glow-a)"
              opacity="0.55"
              d="M -125 920 L -125 855 C -35 765 115 722 235 768 C 318 808 338 888 268 908 L 435 920 Z"
            />
            <path
              fill="url(#login-cloud-glow-b)"
              opacity="0.5"
              d="M 505 920 L 505 838 C 605 748 775 698 905 752 C 1005 798 1025 888 945 908 L 1115 920 Z"
            />
            <path
              fill="url(#login-cloud-glow-c)"
              opacity="0.48"
              d="M 965 920 L 965 848 C 1075 752 1245 702 1385 758 C 1485 808 1500 898 1410 915 L 1565 920 Z"
            />
          </g>

          <!-- тонкие блики по гребням (отдельные низкие капли без нижней «полки») -->
          <g opacity="0.55" class="mix-blend-screen">
            <path
              fill="url(#login-cloud-rim-lit)"
              opacity="0.85"
              d="M -80 898 C 95 805 285 765 420 805 C 540 842 565 880 395 898 L -80 898 Z"
            />
            <path
              fill="url(#login-cloud-rim-lit)"
              opacity="0.7"
              d="M 465 910 C 615 812 795 772 935 818 C 1065 858 1090 895 955 910 L 465 910 Z"
            />
            <path
              fill="url(#login-cloud-rim-lit)"
              opacity="0.65"
              d="M 1005 905 C 1165 805 1345 765 1495 812 C 1605 852 1625 892 1475 905 L 1005 905 Z"
            />
          </g>
        </g>

        <g
          class="will-change-transform animate-drift-slow [transform-origin:bottom_center] [animation-delay:-20s] opacity-[0.68]"
        >
          <path
            filter="url(#login-cloud-blur)"
            fill="rgba(236,248,255,0.28)"
            d="M -200 920 L -200 798
              C -55 708 145 668 305 718 C 465 668 625 692 785 732
              C 945 688 1105 708 1265 748 C 1425 708 1585 728 1745 762
              C 1865 732 1965 748 1995 765 L 1980 920 Z"
          />
          <path
            fill="rgba(220,236,255,0.22)"
            d="M -120 920 L -120 848
              C 45 758 245 718 425 762 C 585 722 745 742 905 778
              C 1065 738 1225 758 1385 792 C 1545 762 1705 778 1845 808
              L 1945 920 Z"
          />
        </g>

        <!-- звёзды: больше точек, два темпа мерцания -->
        <g class="text-sky-100 opacity-[0.72]">
          <circle cx="120" cy="80" r="1.1" fill="currentColor" class="animate-twinkle opacity-80" />
          <circle cx="260" cy="55" r="0.9" fill="#E0F2FE" class="animate-twinkle-slow [animation-delay:0.3s]" />
          <circle cx="400" cy="120" r="1.4" fill="currentColor" class="animate-twinkle [animation-delay:0.7s]" />
          <circle cx="520" cy="40" r="0.8" fill="#BAE6FD" class="animate-twinkle-slow [animation-delay:1.1s]" />
          <circle cx="680" cy="95" r="1.2" fill="currentColor" class="animate-twinkle [animation-delay:0.2s]" />
          <circle cx="780" cy="32" r="0.7" fill="#E0F2FE" class="animate-twinkle-slow [animation-delay:1.8s]" />
          <circle cx="900" cy="140" r="1.3" fill="currentColor" class="animate-twinkle [animation-delay:1.4s]" />
          <circle cx="1020" cy="68" r="0.9" fill="#BAE6FD" class="animate-twinkle-slow [animation-delay:0.5s]" />
          <circle cx="1140" cy="115" r="1.1" fill="currentColor" class="animate-twinkle [animation-delay:2.1s]" />
          <circle cx="1260" cy="48" r="0.85" fill="#E0F2FE" class="animate-twinkle-slow [animation-delay:0.9s]" />
          <circle cx="1340" cy="155" r="1.2" fill="currentColor" class="animate-twinkle [animation-delay:1.6s]" />
          <circle cx="1380" cy="72" r="0.75" fill="#BAE6FD" class="animate-twinkle-slow [animation-delay:2.4s]" />
          <circle cx="180" cy="200" r="0.9" fill="currentColor" class="animate-twinkle [animation-delay:0.4s]" />
          <circle cx="340" cy="175" r="1.1" fill="#E0F2FE" class="animate-twinkle-slow [animation-delay:1.2s]" />
          <circle cx="580" cy="210" r="0.8" fill="currentColor" class="animate-twinkle [animation-delay:1.9s]" />
          <circle cx="720" cy="165" r="1.25" fill="#BAE6FD" class="animate-twinkle-slow [animation-delay:0.6s]" />
          <circle cx="860" cy="220" r="0.95" fill="currentColor" class="animate-twinkle [animation-delay:2.2s]" />
          <circle cx="1000" cy="188" r="0.7" fill="#E0F2FE" class="animate-twinkle-slow [animation-delay:1.5s]" />
          <circle cx="1180" cy="235" r="1.15" fill="currentColor" class="animate-twinkle [animation-delay:0.8s]" />
          <circle cx="1300" cy="198" r="0.85" fill="#BAE6FD" class="animate-twinkle-slow [animation-delay:2s]" />
          <circle cx="220" cy="320" r="0.75" fill="currentColor" class="animate-twinkle [animation-delay:1.1s]" />
          <circle cx="480" cy="300" r="1" fill="#E0F2FE" class="animate-twinkle-slow [animation-delay:0.4s]" />
          <circle cx="640" cy="355" r="0.9" fill="currentColor" class="animate-twinkle [animation-delay:1.7s]" />
          <circle cx="920" cy="330" r="1.2" fill="#BAE6FD" class="animate-twinkle-slow [animation-delay:1.3s]" />
          <circle cx="1080" cy="380" r="0.8" fill="currentColor" class="animate-twinkle [animation-delay:0.15s]" />
          <circle cx="1240" cy="340" r="1.05" fill="#E0F2FE" class="animate-twinkle-slow [animation-delay:2.3s]" />
          <circle cx="90" cy="420" r="0.85" fill="currentColor" class="animate-twinkle [animation-delay:1s]" />
          <circle cx="380" cy="450" r="1.1" fill="#BAE6FD" class="animate-twinkle-slow [animation-delay:0.7s]" />
          <circle cx="760" cy="410" r="0.75" fill="currentColor" class="animate-twinkle [animation-delay:1.8s]" />
          <circle cx="980" cy="470" r="1.15" fill="#E0F2FE" class="animate-twinkle-slow [animation-delay:0.25s]" />
          <circle cx="60" cy="260" r="0.7" fill="currentColor" class="animate-twinkle [animation-delay:2.5s]" />
          <circle cx="1320" cy="280" r="0.95" fill="#BAE6FD" class="animate-twinkle-slow [animation-delay:1.4s]" />
        </g>
      </svg>
    </div>

    <div
      class="relative z-[1] w-full max-w-[420px] rounded-[1.35rem] border border-white/20 bg-white/[0.12] p-10 text-center shadow-[0_24px_80px_-12px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-2xl sm:p-12"
    >
      <div class="mb-2 flex flex-col items-center gap-4">
        <div
          class="relative rounded-2xl bg-gradient-to-br from-white/35 via-white/10 to-white/5 p-[3px] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)] ring-1 ring-white/25"
        >
          <div
            class="flex items-center justify-center rounded-[0.9rem] bg-gradient-to-b from-white/20 to-white/[0.06] px-3 py-2.5 backdrop-blur-md"
          >
            <AppLogoMark :size="56" variant="hero" />
          </div>
        </div>
        <div>
          <h1 class="text-[24px] font-extrabold tracking-tight text-white drop-shadow-sm sm:text-[26px]">OTE Manager</h1>
          <p class="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-100/80">Case.One · тестовые окружения</p>
        </div>
      </div>

      <p class="mb-8 text-[15px] font-medium leading-snug text-white/88">Вход в личный кабинет</p>

      <div
        v-if="errorMessage"
        class="mb-6 rounded-xl border border-rose-300/50 bg-rose-50/95 px-3.5 py-2.5 text-left text-sm font-semibold text-rose-800 shadow-sm"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <button
        v-if="oauthReady"
        type="button"
        class="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3.5 text-[15px] font-bold text-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_8px_28px_rgba(0,0,0,0.15)]"
        @click="onLogin"
      >
        <span
          class="inline-flex size-[24px] items-center justify-center rounded-full bg-[#FC3F1D] text-[12px] font-black text-white shadow-inner"
        >Я</span>
        Войти через Яндекс
      </button>
      <div
        v-else
        class="rounded-xl border border-amber-200/70 bg-amber-50/95 px-3.5 py-3.5 text-left text-sm text-amber-950 shadow-sm"
      >
        <p class="font-bold">OAuth не настроен</p>
        <p class="mt-1.5 text-xs leading-relaxed">
          Задайте в <code class="rounded bg-white/90 px-1 font-mono text-[11px]">.env</code> или
          <code class="rounded bg-white/90 px-1 font-mono text-[11px]">.env.local</code> переменные
          <code class="rounded bg-white/90 px-1 font-mono text-[11px]">NUXT_PUBLIC_YANDEX_CLIENT_ID</code>,
          <code class="rounded bg-white/90 px-1 font-mono text-[11px]">NUXT_YANDEX_CLIENT_SECRET</code>,
          <code class="rounded bg-white/90 px-1 font-mono text-[11px]">NUXT_SESSION_SECRET</code> и
          <code class="rounded bg-white/90 px-1 font-mono text-[11px]">NUXT_PUBLIC_SITE_URL</code> (см. README).
        </p>
      </div>

      <p
        v-if="!oauthReady"
        class="mt-7 border-t border-white/15 pt-5 text-left text-[11px] leading-relaxed text-white/65"
      >
        <span class="font-semibold text-white/80">Callback</span> в приложении Яндекс OAuth:
        <span class="mt-1 block break-all font-mono text-[10px] text-sky-100/95">{{ callbackHint }}</span>
      </p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'auth' })

const route = useRoute()
const auth = useAuthStore()
const config = useRuntimeConfig()

const oauthReady = computed(() => Boolean(config.public.yandexClientId))

const errorMessage = computed(() => {
  const e = route.query.error
  return typeof e === 'string' ? decodeURIComponent(e) : ''
})

const callbackHint = computed(() => {
  const base = String(config.public.siteUrl || '').replace(/\/$/, '') || 'http://localhost:3000'
  return `${base}/api/auth/yandex/callback`
})

function onLogin() {
  auth.startYandexLogin('/')
}
</script>
