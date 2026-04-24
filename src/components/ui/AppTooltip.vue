<template>
  <span v-if="!hasTip" class="block w-full">
    <slot v-bind="{ describedBy: undefined }" />
  </span>
  <span
    v-else
    ref="rootRef"
    class="block w-full"
    @mouseenter="onTriggerEnter"
    @mouseleave="onTriggerLeave"
  >
    <slot v-bind="{ describedBy: visible ? tooltipHtmlId : undefined }" />
    <Teleport to="body">
      <Transition name="app-tooltip" @after-enter="updatePosition">
        <div
          v-if="visible"
          :id="tooltipHtmlId"
          ref="panelRef"
          role="tooltip"
          class="fixed z-[300] overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-xl shadow-slate-900/12 ring-1 ring-slate-900/[0.04]"
          :style="panelStyle"
          @mouseenter="onPanelEnter"
          @mouseleave="onPanelLeave"
        >
          <div class="h-0.5 bg-gradient-to-r from-brand via-sky-500 to-emerald-400" aria-hidden="true" />
          <div class="px-3.5 pb-3 pt-2.5">
            <template v-if="display.eyebrow">
              <p class="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {{ display.eyebrow }}
              </p>
              <p class="break-all font-mono text-sm font-bold leading-snug text-slate-900">{{ display.code }}</p>
            </template>
            <p v-else class="break-words text-sm font-bold leading-snug text-slate-800">{{ display.code }}</p>
            <p
              v-if="display.hint"
              class="mt-2 border-t border-slate-100 pt-2 text-xs font-medium leading-relaxed text-slate-600"
            >
              {{ display.hint }}
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = defineProps({
  /** Текст подсказки; блок после пустой строки показывается отдельным абзацем. */
  content: { type: String, default: '' },
  showDelay: { type: Number, default: 110 },
  hideDelay: { type: Number, default: 140 },
})

const hasTip = computed(() => !!String(props.content ?? '').trim())

const display = computed(() => {
  const raw = String(props.content ?? '').trim()
  if (!raw) return { eyebrow: '', code: '', hint: '' }
  const idx = raw.indexOf('\n\n')
  const head = idx >= 0 ? raw.slice(0, idx).trim() : raw
  const hint = idx >= 0 ? raw.slice(idx + 2).trim() : ''
  const m = head.match(/^Параметр\s+TeamCity:\s*(.+)$/i)
  if (m) return { eyebrow: 'Параметр TeamCity', code: m[1].trim(), hint }
  return { eyebrow: '', code: head, hint }
})

const rootRef = ref(null)
const panelRef = ref(null)
const visible = ref(false)
const panelStyle = ref({ top: '0px', left: '0px', maxWidth: '280px' })

const uid = useId()
const tooltipHtmlId = `ote-tooltip-${uid.replace(/[^a-z0-9-]/gi, '')}`

let showTimer = null
let hideTimer = null

function clearShowTimer() {
  if (showTimer != null) {
    clearTimeout(showTimer)
    showTimer = null
  }
}

function clearHideTimer() {
  if (hideTimer != null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function scheduleShow() {
  if (!hasTip.value) return
  clearHideTimer()
  clearShowTimer()
  showTimer = setTimeout(() => {
    showTimer = null
    visible.value = true
  }, props.showDelay)
}

function scheduleHide() {
  clearShowTimer()
  clearHideTimer()
  hideTimer = setTimeout(() => {
    hideTimer = null
    visible.value = false
  }, props.hideDelay)
}

function onTriggerEnter() {
  scheduleShow()
}

function onTriggerLeave() {
  scheduleHide()
}

function onPanelEnter() {
  clearHideTimer()
}

function onPanelLeave() {
  scheduleHide()
}

function onEscape(e) {
  if (e.key === 'Escape') visible.value = false
}

function updatePosition() {
  const root = rootRef.value
  const panel = panelRef.value
  if (!root || !panel) return
  const r = root.getBoundingClientRect()
  const pad = 10
  const maxW = Math.min(300, Math.max(200, window.innerWidth - 2 * pad))
  panel.style.maxWidth = `${maxW}px`
  void panel.offsetWidth
  const pr = panel.getBoundingClientRect()
  let left = r.left
  const w = pr.width
  left = Math.max(pad, Math.min(left, window.innerWidth - w - pad))
  let top = r.bottom + 8
  const h = pr.height
  if (top + h > window.innerHeight - pad) {
    top = Math.max(pad, r.top - h - 8)
  }
  panelStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    maxWidth: `${maxW}px`,
  }
}

watch(visible, async (v) => {
  if (v) {
    await nextTick()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => updatePosition())
    })
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('keydown', onEscape, true)
  } else {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
    document.removeEventListener('keydown', onEscape, true)
  }
})

onBeforeUnmount(() => {
  clearShowTimer()
  clearHideTimer()
  visible.value = false
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
  document.removeEventListener('keydown', onEscape, true)
})
</script>

<style scoped>
.app-tooltip-enter-active,
.app-tooltip-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}
.app-tooltip-enter-from,
.app-tooltip-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
</style>
