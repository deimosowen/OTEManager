<template>
  <div class="flex min-h-[calc(100vh-7rem)] flex-1 flex-col">
    <div class="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-0">
    <!-- Палитра -->
    <aside
      class="flex w-full shrink-0 flex-col rounded-2xl border border-slate-200/80 bg-white shadow-card lg:w-[300px] lg:rounded-r-none lg:border-r-0 lg:shadow-none"
      :data-tour="demoSandbox ? tourAttrs.palette : undefined"
    >
      <div class="border-b border-slate-100 px-5 py-4">
        <div class="flex items-center gap-2">
          <div
            class="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark shadow-sm"
          >
            <Layers class="size-5 text-white" stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-sm font-extrabold text-slate-900">Блоки сценария</h2>
            <p class="text-xs font-medium text-slate-500">Перетащите на холст или настройте в модалке</p>
          </div>
        </div>
        <div class="mt-4" :data-tour="demoSandbox ? tourAttrs.paletteFilter : undefined">
          <AppSelect
            v-model="paletteFilter"
            label="Показать"
            :options="paletteFilterOptions"
            placeholder="Тип блоков"
            panel-max-height-px="280"
          />
        </div>
      </div>
      <div
        class="custom-scrollbar max-h-[320px] overflow-y-auto px-4 py-4 lg:max-h-none lg:flex-1"
        :data-tour="demoSandbox ? tourAttrs.paletteList : undefined"
      >
        <div v-for="section in filteredPaletteSections" :key="section.title" class="mb-6 last:mb-2">
          <p class="mb-2.5 px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {{ section.title }}
          </p>
          <div class="flex flex-col gap-2">
            <button
              v-for="item in section.items"
              :key="item.variant"
              type="button"
              draggable="true"
              class="flex w-full cursor-grab touch-manipulation items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-left transition hover:border-brand/35 hover:bg-brand-light/40 hover:shadow-sm active:cursor-grabbing"
              @dragstart="onPaletteDragStart($event, item)"
              @click="onPaletteClick(item)"
            >
              <span
                class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80"
                :class="miniIconTint(item.kind)"
              >
                <component :is="iconFor(item.iconKey)" class="size-[18px]" stroke-width="2" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-bold text-slate-800">{{ item.title }}</span>
                <span class="mt-0.5 block text-xs font-medium leading-snug text-slate-500">{{
                  item.subtitle
                }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
      <div v-if="demoSandbox" class="hidden border-t border-slate-100 px-4 py-3 lg:block">
        <p class="text-[11px] leading-relaxed text-slate-500">
          Это демо-песочница: граф не уходит на сервер. «Сбросить демо» вернёт пример; «Очистить холст» оставит холст пустым.
        </p>
      </div>
      <div v-else class="hidden border-t border-slate-100 px-4 py-3 lg:block">
        <p class="text-[11px] leading-relaxed text-slate-500">
          Несколько связей от триггера — параллельные ветки. У условий два выхода; у ожидания TeamCity — успех и ошибка.
          Удалить связь: клик по линии или
          <kbd class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] font-bold">Del</kbd>
          при выделенной линии. Удалить блок:
          <kbd class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] font-bold">Del</kbd>
          по узлу.
        </p>
      </div>
    </aside>

    <!-- Холст -->
    <div
      class="relative flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card lg:min-h-[calc(100vh-7rem)] lg:rounded-l-none"
    >
      <header
        class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 sm:px-5"
      >
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <p class="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Граф сценария</p>
          <span
            v-if="demoSandbox"
            class="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900"
          >
            Демо
          </span>
          <Transition name="graph-save-hint">
            <span
              v-if="!demoSandbox && graphSaveHint.message"
              class="min-w-0 truncate text-[11px] font-medium leading-none"
              :class="graphSaveHintClass"
            >
              {{ graphSaveHint.message }}
            </span>
          </Transition>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="demoSandbox"
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            @click="resetDemoSandbox"
          >
            <RotateCcw class="size-3.5" />
            Сбросить демо
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-50"
            @click="clearCanvas"
          >
            <Trash2 class="size-3.5" />
            Очистить холст
          </button>
        </div>
      </header>

      <div
        class="relative min-h-0 flex-1"
        :data-tour="demoSandbox ? tourAttrs.flowCanvas : undefined"
      >
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :default-viewport="{ zoom: 0.82, x: 0, y: 0 }"
          :min-zoom="0.28"
          :max-zoom="1.85"
          :snap-to-grid="true"
          :snap-grid="[16, 16]"
          :default-edge-options="defaultEdgeOptions"
          :connection-line-style="{ stroke: '#94a3b8', strokeWidth: 2 }"
          :is-valid-connection="isValidConnection"
          :edges-focusable="true"
          :elements-selectable="true"
          :delete-key-code="['Backspace', 'Delete']"
          class="automation-flow"
          @connect="onConnect"
          @dragover="onDragOver"
          @drop="onDrop"
        >
          <Background pattern-color="#cbd5e11a" :gap="20" variant="dots" :size="1" />
          <Controls :show-interactive="false" position="bottom-left" />
          <MiniMap
            class="!rounded-xl !border !border-slate-200 !bg-white/95 !shadow-card"
            :node-color="minimapColor"
            pannable
            zoomable
          />
          <template #node-autoBlock="nodeProps">
            <AutomationBlockNode v-bind="nodeProps" @edit-request="onNodeEditRequest(nodeProps.id)" />
          </template>
          <template #edge-automationDeletable="edgeProps">
            <AutomationDeletableEdge v-bind="edgeProps" />
          </template>
        </VueFlow>
      </div>
    </div>
    </div>

    <AutomationBlockConfigModal
      v-model="configModalOpen"
      :palette-item="pendingPaletteItem"
      :mode="blockModalMode"
      :initial-config="pendingInitialConfig"
      @confirm="onBlockConfigConfirm"
    />
  </div>
</template>

<script setup>
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { MarkerType, VueFlow, addEdge, useVueFlow } from '@vue-flow/core'
import {
  Bell,
  CalendarClock,
  Clock,
  Filter,
  GitBranch,
  Globe,
  Layers,
  Play,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Timer,
  Trash2,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppSelect from '~/components/ui/AppSelect.vue'
import AutomationBlockConfigModal from '~/components/automation/AutomationBlockConfigModal.vue'
import { loadManualLaunchPanelFromApi } from '~/composables/useManualHomeLaunch.js'
import { useUserTimeFormat } from '~/composables/useUserTimeFormat.js'
import {
  formatTimezoneShortRu,
  summarizeAutomationScheduleConfig,
  weekdaysSummaryRu,
} from '~/constants/automation-schedule.js'
import { summarizeIfElseConfig } from '~/constants/automation-if-else.js'
import { summarizeWaitTeamCityConfig } from '~/constants/automation-wait-teamcity.js'
import { normalizeManualHomeConfig } from '~/constants/automation-manual-home.js'
import AutomationBlockNode from '~/components/automation/AutomationBlockNode.vue'
import AutomationDeletableEdge from '~/components/automation/AutomationDeletableEdge.vue'
import { AUTOMATION_WORKFLOW_BUILDER_TOUR_ATTRS } from '~/tours/automation/workflow-builder-tour-data.js'
import {
  automationConnectionSignature,
  normalizeAutomationConnectionForFlow,
  validateAutomationConnection,
} from '~/utils/automation-graph.js'

const tourAttrs = AUTOMATION_WORKFLOW_BUILDER_TOUR_ATTRS

const DND_MIME = 'application/ote-automation-block'

/** Тип ребра с кнопкой удаления на линии (раньше сохраняли как smoothstep). */
const AUTOMATION_EDGE_TYPE = 'automationDeletable'

const props = defineProps({
  scenarioId: { type: String, required: true },
  /** Песочница: без автосохранения и финального persist при размонтировании. */
  demoSandbox: { type: Boolean, default: false },
  initialGraph: {
    type: Object,
    required: true,
    validator: (v) => v && typeof v === 'object',
  },
})

const toast = useToast()
const { timeZone } = useUserTimeFormat()

/** Ненавязчивый статус автосохранения графа (справа от подписи «Граф сценария»). */
const graphSaveHint = ref(
  /** @type {{ state: 'idle' | 'saving' | 'saved' | 'error', message: string }} */ ({
    state: 'idle',
    message: '',
  }),
)

const graphSaveHintClass = computed(() => {
  const s = graphSaveHint.value.state
  if (s === 'saving') return 'text-slate-400'
  if (s === 'saved') return 'text-slate-400'
  if (s === 'error') return 'text-rose-600/85'
  return 'text-slate-400'
})

function syncIdSeqFromNodes(nodeList) {
  let max = 0
  for (const n of nodeList || []) {
    const m = /^b-(\d+)$/.exec(String(n.id || ''))
    if (m) max = Math.max(max, Number(m[1]))
  }
  if (max > 0) idSeq = Math.max(idSeq, max + 1)
}

const defaultEdgeOptions = {
  type: AUTOMATION_EDGE_TYPE,
  animated: true,
  style: { stroke: '#64748b', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#64748b' },
}

let idSeq = 1
function nextId() {
  return `b-${idSeq++}`
}

const { project, addNodes, fitView, setNodes, setEdges } = useVueFlow()

/** При перетаскивании связи только самопетля; жёсткая семантика графа — при сохранении/запуске по желанию API. */
function isValidConnection(connection) {
  const s = String(connection?.source ?? '')
  const t = String(connection?.target ?? '')
  return Boolean(s && t && s !== t)
}

/** Связь по drop на handle; dedupe на случай двойного применения со стороны Vue Flow */
function onConnect(connection) {
  const norm = normalizeAutomationConnectionForFlow(connection, nodes.value)
  const c = {
    ...connection,
    source: norm.source,
    target: norm.target,
    sourceHandle: norm.sourceHandle ?? undefined,
    targetHandle: norm.targetHandle ?? undefined,
  }
  const newSig = automationConnectionSignature(c)
  const dup = edges.value.some((e) => automationConnectionSignature(e) === newSig)
  if (dup) return

  const v = validateAutomationConnection(c, nodes.value, edges.value)
  if (!v.ok) {
    toast.show(v.reason || 'Такую связь нельзя добавить', 'warn')
    return
  }

  edges.value = addEdge(c, [...edges.value], defaultEdgeOptions)
}

/** @type {'trigger'|'condition'|'action'|'wait'} */
const paletteFilter = ref('trigger')
const paletteFilterOptions = [
  { value: 'trigger', label: 'Триггеры' },
  { value: 'condition', label: 'Условия' },
  { value: 'wait', label: 'Ожидание' },
  { value: 'action', label: 'Действия' },
]

const paletteSections = [
  {
    kind: 'trigger',
    title: 'Триггеры',
    items: [
      {
        variant: 'schedule',
        kind: 'trigger',
        iconKey: 'CalendarClock',
        title: 'Запуск по расписанию',
        subtitle: 'Запуск по дням недели и времени из вашего профиля',
        configModal: 'schedule',
      },
      {
        variant: 'manual',
        kind: 'trigger',
        iconKey: 'Bell',
        title: 'Ручной запуск',
        subtitle: 'Блок на холсте и кнопка запуска на главной рядом с системными действиями',
        configModal: 'manual',
      },
    ],
  },
  {
    kind: 'condition',
    title: 'Условия',
    items: [
      {
        variant: 'if_else',
        kind: 'condition',
        iconKey: 'GitBranch',
        title: 'Условие If / Else',
        subtitle: 'Каталог YC: автор, тег среды, запуск/остановка или наличие записи · две ветки',
        configModal: 'if_else',
      },
    ],
  },
  {
    kind: 'wait',
    title: 'Ожидание',
    items: [
      {
        variant: 'teamcity_build',
        kind: 'wait',
        iconKey: 'Timer',
        title: 'Ожидание сборки TeamCity',
        subtitle: 'До завершения сборки (не только очередь). Вход — от блока с TC; два выхода',
        configModal: 'wait_teamcity',
      },
    ],
  },
  {
    kind: 'action',
    title: 'Действия',
    items: [
      {
        variant: 'start_mine',
        kind: 'action',
        iconKey: 'Play',
        title: 'Запуск моих ВМ',
        subtitle: 'Старт инстансов по фильтру автора',
      },
      {
        variant: 'stop_mine',
        kind: 'action',
        iconKey: 'PowerOff',
        title: 'Остановка моих ВМ',
        subtitle: 'Мягкое выключение подходящих ВМ',
      },
      {
        variant: 'notify_bell',
        kind: 'action',
        iconKey: 'Bell',
        title: 'Уведомление в колокольчик',
        subtitle: 'Заголовок и текст в списке уведомлений в шапке',
        configModal: 'notify_bell',
      },
      {
        variant: 'create_template',
        kind: 'action',
        iconKey: 'Plus',
        title: 'Создать из шаблона',
        subtitle: 'Очередь создания OTE по шаблону и сохранённым параметрам',
        configModal: 'create_template',
      },
    ],
  },
]

const filteredPaletteSections = computed(() =>
  paletteSections.filter((s) => s.kind === paletteFilter.value),
)

const configModalOpen = ref(false)
/** @type {import('vue').Ref<object | null>} */
const pendingPaletteItem = ref(null)
/** @type {import('vue').Ref<{ x: number; y: number } | null>} */
const pendingFlowPosition = ref(null)
/** Редактирование существующего узла */
const editingNodeId = ref(/** @type {string | null} */ (null))
/** @type {import('vue').Ref<Record<string, unknown> | null>} */
const pendingInitialConfig = ref(null)

const blockModalMode = computed(() => (editingNodeId.value ? 'edit' : 'add'))

watch(configModalOpen, (open) => {
  if (!open) {
    nextTick(() => {
      pendingPaletteItem.value = null
      pendingFlowPosition.value = null
      editingNodeId.value = null
      pendingInitialConfig.value = null
    })
  }
})

/** @param {{ kind?: string, variant?: string }} data */
function paletteItemForNodeData(data) {
  const variant = String(data?.variant || '')
  const kind = String(data?.kind || '')
  for (const section of paletteSections) {
    const it = section.items.find((i) => i.variant === variant && i.kind === kind)
    if (it) return it
  }
  return null
}

/** @param {string} nodeId */
function onNodeEditRequest(nodeId) {
  const n = nodes.value.find((x) => String(x.id) === String(nodeId))
  if (!n?.data) return
  const item = paletteItemForNodeData(n.data)
  if (!item?.configModal) {
    toast.show('У этого типа блока нет настроек.', 'info')
    return
  }
  editingNodeId.value = String(nodeId)
  pendingPaletteItem.value = item
  pendingInitialConfig.value =
    n.data.config && typeof n.data.config === 'object'
      ? /** @type {Record<string, unknown>} */ (JSON.parse(JSON.stringify(n.data.config)))
      : {}
  configModalOpen.value = true
}

/** @param {string} variant @param {Record<string, unknown>} config */
function buildSummary(variant, config) {
  if (variant === 'schedule') {
    const iana =
      typeof config.timezone === 'string' && config.timezone.trim()
        ? config.timezone.trim()
        : String(timeZone.value || '').trim() || 'UTC'
    return summarizeAutomationScheduleConfig(config, formatTimezoneShortRu(iana))
  }
  if (variant === 'time_msk') {
    const mode = config.mode
    if (mode === 'after') return `После ${config.t1} МСК`
    if (mode === 'before') return `До ${config.t1} МСК`
    return `Между ${config.t1} и ${config.t2} МСК`
  }
  if (variant === 'weekday') {
    const dm = config.dayMode === 'working' ? 'Рабочие' : 'Календарные'
    const days = Array.isArray(config.weekdays) ? weekdaysSummaryRu(config.weekdays) : ''
    return `${dm}: ${days}`
  }
  if (variant === 'if_else') {
    return summarizeIfElseConfig(config)
  }
  if (variant === 'teamcity_build') {
    return summarizeWaitTeamCityConfig(config)
  }
  if (variant === 'notify_bell') {
    const t = String(config.title || '').trim()
    return t ? `Уведомление: ${t}` : 'Уведомление в колокольчик'
  }
  if (variant === 'create_template') {
    const name = String(config.templateName || '').trim()
    const bid = config.buildTemplateId
    if (name) return `Шаблон: ${name}`
    if (bid != null && String(bid).trim()) return `Шаблон #${bid}`
    return 'Создать из шаблона'
  }
  if (variant === 'manual') {
    const n = normalizeManualHomeConfig(config)
    const labels = n.buttons.map((b) => b.label).join(', ')
    return labels ? `Главная · ${labels}` : 'Ручной запуск'
  }
  return ''
}

function flowClickPosition() {
  return { x: 320, y: 200 }
}

function requestAddBlock(item, flowPosition) {
  if (item.configModal) {
    pendingPaletteItem.value = item
    pendingFlowPosition.value = flowPosition
    configModalOpen.value = true
    return
  }
  addNodes([nodeFromTemplate(item, flowPosition)])
  requestAnimationFrame(() => fitView({ ...fitViewComfort, duration: 320 }))
}

function onPaletteClick(item) {
  requestAddBlock(item, flowClickPosition())
}

function onBlockConfigConfirm(config) {
  const item = pendingPaletteItem.value
  const pos = pendingFlowPosition.value || flowClickPosition()
  if (!item) return

  const editId = editingNodeId.value
  if (editId) {
    const idx = nodes.value.findIndex((n) => String(n.id) === String(editId))
    if (idx >= 0) {
      const n = nodes.value[idx]
      const summary = buildSummary(item.variant, config)
      let title = item.title
      if (
        (item.variant === 'if_else' || item.variant === 'teamcity_build') &&
        config &&
        typeof config === 'object'
      ) {
        const custom = String(config.blockTitle || '').trim()
        if (custom) title = custom
      }
      const updated = {
        ...n,
        data: {
          ...n.data,
          title,
          subtitle: summary || item.subtitle,
          config,
        },
      }
      const copy = [...nodes.value]
      copy[idx] = updated
      nodes.value = copy
    }
    editingNodeId.value = null
    pendingPaletteItem.value = null
    pendingInitialConfig.value = null
    requestAnimationFrame(() => fitView({ ...fitViewComfort, duration: 280 }))
    return
  }

  const summary = buildSummary(item.variant, config)
  addNodes([nodeFromTemplate(item, pos, { config, configSummary: summary })])
  if (item.variant === 'manual') {
    toast.show('Блок добавлен; кнопка на главной появится после сохранения сценария.', 'success')
  }
  requestAnimationFrame(() => fitView({ ...fitViewComfort, duration: 320 }))
}

const ICON_MAP = {
  CalendarClock,
  Clock,
  Filter,
  GitBranch,
  Globe,
  Play,
  Plus,
  Power,
  PowerOff,
  Bell,
  Layers,
  Timer,
}

function iconFor(key) {
  return ICON_MAP[key] || Layers
}

function miniIconTint(kind) {
  if (kind === 'trigger') return 'text-teal-600'
  if (kind === 'condition') return 'text-amber-600'
  if (kind === 'wait') return 'text-violet-600'
  if (kind === 'action') return 'text-brand'
  return 'text-slate-600'
}

function minimapColor(node) {
  const k = node?.data?.kind
  if (k === 'trigger') return '#14b8a6'
  if (k === 'condition') return '#f59e0b'
  if (k === 'wait') return '#8b5cf6'
  if (k === 'action') return '#2563eb'
  return '#94a3b8'
}

/**
 * @param {object} item палитра
 * @param {{ x: number; y: number }} position
 * @param {{ config?: Record<string, unknown> | null; configSummary?: string }} [opts]
 */
function nodeFromTemplate(item, position, opts = {}) {
  const config = opts.config !== undefined ? opts.config : null
  const summary =
    opts.configSummary ||
    (config && typeof config === 'object' ? buildSummary(item.variant, config) : '') ||
    ''
  let title = item.title
  if (
    (item.variant === 'if_else' || item.variant === 'teamcity_build') &&
    config &&
    typeof config === 'object'
  ) {
    const custom = String(config.blockTitle || '').trim()
    if (custom) title = custom
  }
  return {
    id: nextId(),
    type: 'autoBlock',
    position,
    data: {
      kind: item.kind,
      variant: item.variant,
      iconKey: item.iconKey,
      title,
      subtitle: summary || item.subtitle,
      config,
    },
  }
}

/** @type {import('vue').Ref<import('@vue-flow/core').Node[]>} */
const nodes = ref([])
/** @type {import('vue').Ref<import('@vue-flow/core').Edge[]>} */
const edges = ref([])

/** После удаления блока Vue Flow может оставить рёбра к несуществующим id — чистим. */
watch(
  nodes,
  () => {
    const ids = new Set(nodes.value.map((n) => String(n.id)))
    const pruned = edges.value.filter((e) => ids.has(String(e.source)) && ids.has(String(e.target)))
    if (pruned.length !== edges.value.length) edges.value = pruned
  },
  { deep: true },
)

const fitViewComfort = { padding: 0.48, maxZoom: 0.78 }

function normalizeLoadedEdges(rawEdges) {
  return rawEdges.map((e) => ({
    ...e,
    type: !e?.type || e.type === 'smoothstep' ? AUTOMATION_EDGE_TYPE : e.type,
  }))
}

function applyLoadedGraph(graph) {
  const ns = Array.isArray(graph?.nodes) ? JSON.parse(JSON.stringify(graph.nodes)) : []
  const esRaw = Array.isArray(graph?.edges) ? JSON.parse(JSON.stringify(graph.edges)) : []
  const es = normalizeLoadedEdges(esRaw)
  setNodes(ns)
  setEdges(es)
  syncIdSeqFromNodes(ns)
  nextTick(() =>
    requestAnimationFrame(() => fitView({ ...fitViewComfort, duration: 340 })),
  )
}

/** Показ «Сохранено» без времени; затем скрытие с затуханием. */
const GRAPH_SAVE_HINT_SAVED_MS = 1200
const GRAPH_SAVE_HINT_ERROR_MS = 2800

/** @type {ReturnType<typeof setTimeout> | null} */
let graphSaveHintHideTimer = null

function clearGraphSaveHintHideTimer() {
  if (graphSaveHintHideTimer != null) {
    clearTimeout(graphSaveHintHideTimer)
    graphSaveHintHideTimer = null
  }
}

/** @param {number} ms */
function scheduleGraphSaveHintHide(ms) {
  clearGraphSaveHintHideTimer()
  graphSaveHintHideTimer = setTimeout(() => {
    graphSaveHint.value = { state: 'idle', message: '' }
    graphSaveHintHideTimer = null
  }, ms)
}

async function persistGraphRemoteSilent() {
  if (props.demoSandbox) return
  const id = Number(props.scenarioId)
  if (!Number.isFinite(id) || id < 1) return
  clearGraphSaveHintHideTimer()
  graphSaveHint.value = { state: 'saving', message: 'Сохранение…' }
  try {
    await $fetch(`/api/ote/automation-scenarios/${id}`, {
      method: 'PUT',
      credentials: 'include',
      body: {
        graph: {
          nodes: JSON.parse(JSON.stringify(nodes.value)),
          edges: JSON.parse(JSON.stringify(edges.value)),
        },
      },
    })
    graphSaveHint.value = { state: 'saved', message: 'Сохранено' }
    await loadManualLaunchPanelFromApi($fetch)
    scheduleGraphSaveHintHide(GRAPH_SAVE_HINT_SAVED_MS)
  } catch (e) {
    const msg = e?.data?.message || e?.message || 'Не удалось сохранить сценарий'
    graphSaveHint.value = { state: 'error', message: 'Ошибка сохранения' }
    toast.show(msg, 'error')
    scheduleGraphSaveHintHide(GRAPH_SAVE_HINT_ERROR_MS)
  }
}

/** Снимок начального графа для «Сбросить демо». */
const demoSnapshot = ref(/** @type {{ nodes: unknown[]; edges: unknown[] } | null} */ (null))

function resetDemoSandbox() {
  const snap = demoSnapshot.value
  if (!snap) return
  applyLoadedGraph(snap)
}

onMounted(() => {
  nextTick(() => {
    applyLoadedGraph(props.initialGraph)
    if (props.demoSandbox) {
      demoSnapshot.value = {
        nodes: JSON.parse(JSON.stringify(props.initialGraph?.nodes || [])),
        edges: JSON.parse(JSON.stringify(props.initialGraph?.edges || [])),
      }
    }
  })
})

let graphPersistTimer = null
watch(
  [nodes, edges],
  () => {
    if (props.demoSandbox) return
    if (!props.scenarioId) return
    clearTimeout(graphPersistTimer)
    graphPersistTimer = setTimeout(() => void persistGraphRemoteSilent(), 700)
  },
  { deep: true },
)

onBeforeUnmount(() => {
  clearTimeout(graphPersistTimer)
  clearGraphSaveHintHideTimer()
  if (!props.demoSandbox) void persistGraphRemoteSilent()
})

function onPaletteDragStart(event, item) {
  if (event.dataTransfer) {
    event.dataTransfer.setData(DND_MIME, JSON.stringify(item))
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(event) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function onDrop(event) {
  event.preventDefault()
  const raw = event.dataTransfer?.getData(DND_MIME)
  if (!raw) return
  try {
    const item = JSON.parse(raw)
    const p = project({ x: event.clientX, y: event.clientY })
    requestAddBlock(item, p)
  } catch {
    /* ignore */
  }
}

function clearCanvas() {
  setNodes([])
  setEdges([])
}
</script>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.automation-flow {
  width: 100%;
  height: 100%;
  min-height: 420px;
}

@media (min-width: 1024px) {
  .automation-flow {
    min-height: calc(100vh - 7rem - 52px);
  }
}

.automation-flow .vue-flow__minimap {
  transform: scale(0.92);
  transform-origin: bottom right;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.6) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.55);
  border-radius: 999px;
}

.graph-save-hint-enter-active,
.graph-save-hint-leave-active {
  transition: opacity 0.35s ease;
}

.graph-save-hint-enter-from,
.graph-save-hint-leave-to {
  opacity: 0;
}
</style>
