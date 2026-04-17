<template>
  <svg :width="size" :height="size" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M8 26 Q12 16 22 14 Q32 12 36 20 Q40 26 36 30 Q32 34 22 32 Q12 30 8 26Z"
      :fill="muted ? '#2563EB' : 'white'"
      :opacity="muted ? '0.25' : '0.9'"
    />
    <path
      d="M12 30 Q15 22 22 20 Q29 18 33 24 Q35 28 31 31 Q27 34 22 33 Q17 32 12 30Z"
      :fill="muted ? '#2563EB' : 'white'"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 28 },
  /** Для светлого фона (шапка) */
  muted: { type: Boolean, default: false },
})
</script>
