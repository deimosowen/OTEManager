<template>
  <div v-if="!hasLinks" class="text-sm text-slate-400">—</div>
  <div v-else ref="rootRef" class="relative inline-flex max-w-full" @mouseenter="onRootEnter" @mouseleave="onRootLeave">
    <button
      type="button"
      class="inline-flex max-w-full items-center gap-1 rounded-md border border-transparent px-1 py-0.5 text-left text-sm font-bold text-brand hover:border-slate-200 hover:bg-slate-50"
      @click.stop="onToggleClick"
    >
      <span class="truncate">{{ triggerText }}</span>
      <ChevronDown class="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <div
        ref="panelRef"
        v-show="open"
        class="fixed z-[100] min-w-[200px] rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl"
        :style="panelStyle"
        role="menu"
        @mouseenter="cancelClose"
        @mouseleave="scheduleClose"
      >
        <a
          v-for="l in displayLinks"
          :key="l.key + l.href"
          :href="l.href"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          role="menuitem"
          @click="open = false"
        >
          <ExternalLink class="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>{{ l.label }}</span>
        </a>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ChevronDown, ExternalLink } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /** @type {{ key: string, label: string, href: string }[]} */
  links: { type: Array, default: () => [] },
  fallbackUrl: { type: String, default: '' },
})

const open = ref(false)
const rootRef = ref(null)
const panelRef = ref(null)
const panelStyle = ref({})
let closeTimer = null

function onDocPointerDown(e) {
  const t = e.target
  if (rootRef.value?.contains(t) || panelRef.value?.contains(t)) return
  open.value = false
}

function onKeydownEscape(e) {
  if (e.key === 'Escape') open.value = false
}

const displayLinks = computed(() => {
  if (Array.isArray(props.links) && props.links.length) return props.links
  if (props.fallbackUrl) return [{ key: 'legacy', label: 'Приложение', href: props.fallbackUrl }]
  return []
})

const hasLinks = computed(() => displayLinks.value.length > 0)

const triggerText = computed(() => {
  const n = displayLinks.value.length
  if (n <= 1) return 'Открыть'
  return `Приложения (${n})`
})

function updatePosition() {
  const el = rootRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  panelStyle.value = {
    top: `${Math.round(r.bottom + 4)}px`,
    left: `${Math.round(Math.min(r.left, window.innerWidth - 220))}px`,
    minWidth: `${Math.max(200, Math.round(r.width))}px`,
  }
}

function cancelClose() {
  if (closeTimer != null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function scheduleClose() {
  cancelClose()
  closeTimer = setTimeout(() => {
    open.value = false
    closeTimer = null
  }, 220)
}

function onRootEnter() {
  cancelClose()
  open.value = true
}

function onRootLeave() {
  scheduleClose()
}

function onToggleClick() {
  open.value = !open.value
}

watch(open, async (v) => {
  if (v) {
    await nextTick()
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('pointerdown', onDocPointerDown, true)
    document.addEventListener('keydown', onKeydownEscape, true)
  } else {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
    document.removeEventListener('pointerdown', onDocPointerDown, true)
    document.removeEventListener('keydown', onKeydownEscape, true)
  }
})

onBeforeUnmount(() => {
  cancelClose()
  open.value = false
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onKeydownEscape, true)
})
</script>
