<template>
  <div
    class="group relative w-[min(100%,280px)] rounded-2xl border-2 bg-white shadow-card transition-[box-shadow,transform,ring] duration-200 will-change-transform"
    :class="[
      ringClass,
      selected ? 'scale-[1.02] shadow-card-md' : 'hover:shadow-card-md',
    ]"
    :data-tutorial="data.tutorialTourAnchor || undefined"
  >
    <button
      v-if="hasConfigModal"
      type="button"
      class="nodrag absolute right-9 top-1.5 z-20 flex size-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-brand-light hover:text-brand group-hover:opacity-100"
      title="Изменить блок"
      aria-label="Изменить блок"
      @click.stop="emit('edit-request')"
    >
      <Settings class="size-4" stroke-width="2.2" />
    </button>
    <button
      type="button"
      class="nodrag absolute right-1.5 top-1.5 z-20 flex size-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
      title="Удалить блок"
      aria-label="Удалить блок"
      @click.stop="onRemove"
    >
      <X class="size-4" stroke-width="2.2" />
    </button>
    <div
      class="relative z-0 flex cursor-default items-start gap-3 px-4 py-3.5 pr-[4.25rem]"
      @dblclick.stop="onDblClick"
    >
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-inner"
        :class="iconWrapClass"
      >
        <component :is="icon" class="size-5 text-white" stroke-width="2" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-extrabold uppercase tracking-wider" :class="categoryTextClass">
          {{ categoryLabel }}
        </p>
        <p class="mt-0.5 text-[15px] font-extrabold leading-snug text-slate-900">
          {{ data.title }}
        </p>
        <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500">
          {{ data.subtitle }}
        </p>
      </div>
    </div>
    <!-- Handles после контента и с z-index — иначе карточка перекрывает target слева и связи не создать -->
    <Handle
      v-if="data.kind !== 'trigger'"
      type="target"
      :position="Position.Left"
      :connectable="true"
      class="!z-[40] !h-3.5 !w-3.5 !border-2 !border-white !bg-slate-400 transition group-hover:!bg-brand"
    />
    <!-- Ожидание TeamCity: «success» / «failure» — после опроса сборок выполняется одна из веток -->
    <template v-if="data.kind === 'wait'">
      <span
        class="pointer-events-none absolute right-2 top-[30%] z-[35] text-[10px] font-extrabold uppercase tracking-wide text-emerald-700"
      >
        Успешно
      </span>
      <span
        class="pointer-events-none absolute right-2 top-[64%] z-[35] text-[10px] font-extrabold uppercase tracking-wide text-rose-700"
      >
        Ошибка
      </span>
      <Handle
        id="success"
        type="source"
        :position="Position.Right"
        :connectable="true"
        :style="{ top: '36%' }"
        class="!z-[40] !h-3.5 !w-3.5 !border-2 !border-white !bg-emerald-500 transition group-hover:!bg-emerald-600"
      />
      <Handle
        id="failure"
        type="source"
        :position="Position.Right"
        :connectable="true"
        :style="{ top: '70%' }"
        class="!z-[40] !h-3.5 !w-3.5 !border-2 !border-white !bg-rose-500 transition group-hover:!bg-rose-600"
      />
    </template>
    <!-- If/Else: источники «yes» / «no» — к ветке подключается только одна из них в зависимости от результата проверки -->
    <template v-else-if="data.kind === 'condition'">
      <span
        class="pointer-events-none absolute right-2 top-[30%] z-[35] text-[10px] font-extrabold uppercase tracking-wide text-emerald-700"
      >
        Да
      </span>
      <span
        class="pointer-events-none absolute right-2 top-[64%] z-[35] text-[10px] font-extrabold uppercase tracking-wide text-slate-500"
      >
        Нет
      </span>
      <Handle
        id="yes"
        type="source"
        :position="Position.Right"
        :connectable="true"
        :style="{ top: '36%' }"
        class="!z-[40] !h-3.5 !w-3.5 !border-2 !border-white !bg-emerald-500 transition group-hover:!bg-emerald-600"
      />
      <Handle
        id="no"
        type="source"
        :position="Position.Right"
        :connectable="true"
        :style="{ top: '70%' }"
        class="!z-[40] !h-3.5 !w-3.5 !border-2 !border-white !bg-slate-400 transition group-hover:!bg-slate-500"
      />
    </template>
    <Handle
      v-else
      type="source"
      :position="Position.Right"
      :connectable="true"
      class="!z-[40] !h-3.5 !w-3.5 !border-2 !border-white !bg-slate-400 transition group-hover:!bg-brand"
    />
  </div>
</template>

<script setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { computed } from 'vue'
import {
  Bell,
  CalendarClock,
  CalendarDays,
  Clock,
  Filter,
  GitBranch,
  Globe,
  Layers,
  Play,
  Plus,
  Power,
  PowerOff,
  Settings,
  Timer,
  X,
} from 'lucide-vue-next'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

const emit = defineEmits(['edit-request'])

const { removeNodes } = useVueFlow()

/** Блоки с configModal в палитре — те же, что открывают модалку при добавлении */
const VARIANTS_WITH_CONFIG = new Set([
  'schedule',
  'manual',
  'if_else',
  'notify_bell',
  'create_template',
  'http_request',
  'start_mine',
  'stop_mine',
  'teamcity_build',
])

const hasConfigModal = computed(() => VARIANTS_WITH_CONFIG.has(String(props.data?.variant || '')))

const ICONS = {
  CalendarClock,
  CalendarDays,
  Clock,
  Filter,
  GitBranch,
  Globe,
  Play,
  Power,
  PowerOff,
  Plus,
  Bell,
  Layers,
  Timer,
}

const icon = computed(() => ICONS[props.data.iconKey] || Layers)

const categoryLabel = computed(() => {
  const k = props.data.kind
  if (k === 'trigger') return 'Триггер'
  if (k === 'condition')
    return props.data.variant === 'if_else' ? 'If / Else' : 'Условие'
  if (k === 'wait') return 'Ожидание'
  if (k === 'action') return 'Действие'
  return 'Блок'
})

const iconWrapClass = computed(() => {
  const k = props.data.kind
  if (k === 'trigger') return 'bg-gradient-to-br from-teal-500 to-emerald-600'
  if (k === 'condition') return 'bg-gradient-to-br from-amber-500 to-orange-600'
  if (k === 'wait') return 'bg-gradient-to-br from-violet-500 to-purple-700'
  if (k === 'action') return 'bg-gradient-to-br from-brand to-brand-dark'
  return 'bg-gradient-to-br from-slate-500 to-slate-700'
})

const categoryTextClass = computed(() => {
  const k = props.data.kind
  if (k === 'trigger') return 'text-teal-600'
  if (k === 'condition') return 'text-amber-700'
  if (k === 'wait') return 'text-violet-700'
  if (k === 'action') return 'text-brand'
  return 'text-slate-500'
})

const ringClass = computed(() => {
  if (!props.selected) return 'border-slate-200/90'
  const k = props.data.kind
  if (k === 'trigger') return 'border-teal-400 ring-2 ring-teal-400/35'
  if (k === 'condition') return 'border-amber-400 ring-2 ring-amber-400/35'
  if (k === 'wait') return 'border-violet-400 ring-2 ring-violet-400/35'
  if (k === 'action') return 'border-brand ring-2 ring-brand/35'
  return 'border-brand ring-2 ring-brand/35'
})

function onRemove() {
  removeNodes([props.id])
}

function onDblClick() {
  if (hasConfigModal.value) emit('edit-request')
}
</script>
