<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="visible"
        class="fixed bottom-7 right-7 z-[9999] flex min-w-[260px] items-center gap-3 rounded-[10px] bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-2xl"
        :class="borderClass"
      >
        <component :is="icon" class="size-[18px] shrink-0" />
        <span>{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, h } from 'vue'
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

const { message, variant, visible } = useToast()

const borderClass = computed(() => {
  if (variant.value === 'success') return 'border-l-4 border-l-emerald-500'
  if (variant.value === 'error') return 'border-l-4 border-l-rose-500'
  if (variant.value === 'warn') return 'border-l-4 border-l-amber-500'
  return 'border-l-4 border-l-sky-400'
})

const icon = computed(() => {
  const props = { strokeWidth: 2.5 }
  if (variant.value === 'success') return h(CheckCircle2, { ...props, class: 'text-emerald-400' })
  if (variant.value === 'error') return h(XCircle, { ...props, class: 'text-rose-400' })
  if (variant.value === 'warn') return h(AlertTriangle, { ...props, class: 'text-amber-400' })
  return h(Info, { ...props, class: 'text-sky-300' })
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
