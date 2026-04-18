<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="viewBox"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    :class="hero ? 'drop-shadow-[0_4px_18px_rgba(15,23,42,0.25)]' : ''"
  >
    <defs>
      <linearGradient :id="ids.grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" :stop-color="hero ? '#FFFFFF' : muted ? '#60A5FA' : '#FFFFFF'" :stop-opacity="hero ? '0.95' : muted ? '0.35' : '0.92'" />
        <stop offset="55%" :stop-color="hero ? '#BFDBFE' : muted ? '#2563EB' : '#E0F2FE'" :stop-opacity="hero ? '0.85' : muted ? '0.5' : '1'" />
        <stop offset="100%" :stop-color="hero ? '#93C5FD' : muted ? '#1D4ED8' : '#FFFFFF'" :stop-opacity="hero ? '0.75' : muted ? '0.4' : '0.88'" />
      </linearGradient>
      <linearGradient v-if="hero" :id="ids.ring" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.08" />
      </linearGradient>
      <filter v-if="hero" :id="ids.glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <template v-if="hero">
      <ellipse
        cx="28"
        cy="28"
        rx="24"
        ry="10"
        :stroke="`url(#${ids.ring})`"
        stroke-width="0.75"
        transform="rotate(-18 28 28)"
        opacity="0.9"
      />
      <ellipse
        cx="28"
        cy="28"
        rx="22"
        ry="8"
        stroke="rgba(255,255,255,0.22)"
        stroke-width="0.5"
        stroke-dasharray="3 5"
        transform="rotate(12 28 28)"
      />
      <circle cx="10" cy="18" r="2.2" fill="#FFFFFF" opacity="0.85" />
      <circle cx="46" cy="22" r="1.8" fill="#BFDBFE" opacity="0.9" />
      <circle cx="40" cy="40" r="2" fill="#FFFFFF" opacity="0.7" />
      <line x1="10" y1="18" x2="18" y2="24" stroke="rgba(255,255,255,0.35)" stroke-width="0.6" />
      <line x1="40" y1="40" x2="32" y2="34" stroke="rgba(255,255,255,0.3)" stroke-width="0.6" />
      <line x1="46" y1="22" x2="36" y2="26" stroke="rgba(255,255,255,0.25)" stroke-width="0.6" />
      <path
        d="M10 30 Q14 14 28 12 Q42 10 46 22 Q50 30 44 36 Q38 42 28 40 Q18 38 10 30Z"
        :fill="`url(#${ids.grad})`"
        :filter="`url(#${ids.glow})`"
      />
      <path
        d="M14 34 Q17 24 28 22 Q39 20 42 28 Q44 32 38 36 Q32 40 28 39 Q24 38 14 34Z"
        fill="rgba(255,255,255,0.35)"
      />
      <ellipse cx="22" cy="20" rx="8" ry="5" fill="rgba(255,255,255,0.22)" transform="rotate(-25 22 20)" />
      <path d="M28 16 L32 14 L30 20 Z" fill="rgba(255,255,255,0.5)" />
    </template>

    <template v-else>
      <path
        d="M8 26 Q12 16 22 14 Q32 12 36 20 Q40 26 36 30 Q32 34 22 32 Q12 30 8 26Z"
        :fill="muted ? '#2563EB' : `url(#${ids.grad})`"
        :opacity="muted ? '0.25' : '1'"
      />
      <path
        v-if="!muted"
        d="M12 30 Q15 22 22 20 Q29 18 33 24 Q35 28 31 31 Q27 34 22 33 Q17 32 12 30Z"
        fill="rgba(255,255,255,0.55)"
      />
      <path
        v-else
        d="M12 30 Q15 22 22 20 Q29 18 33 24 Q35 28 31 31 Q27 34 22 33 Q17 32 12 30Z"
        fill="#2563EB"
        opacity="0.45"
      />
    </template>
  </svg>
</template>

<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  size: { type: [Number, String], default: 28 },
  /** Для светлого фона (шапка) */
  muted: { type: Boolean, default: false },
  /** Развёрнутая марка для экрана входа */
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'hero'].includes(v),
  },
})

const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const ids = computed(() => ({
  grad: `lm-${rawId}-grad`,
  ring: `lm-${rawId}-ring`,
  glow: `lm-${rawId}-glow`,
}))

const hero = computed(() => props.variant === 'hero')
const viewBox = computed(() => (hero.value ? '0 0 56 56' : '0 0 44 44'))
</script>
