<template>
  <BaseEdge
    :id="id"
    :path="path"
    :marker-end="markerEnd"
    :marker-start="markerStart"
    :style="style"
    :interaction-width="interactionWidth"
  />
  <EdgeLabelRenderer v-if="selected">
    <div class="nodrag nopan" :style="labelStyle">
      <button
        type="button"
        class="flex size-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md ring-1 ring-black/[0.04] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        title="Удалить связь"
        aria-label="Удалить связь между блоками"
        @pointerdown.stop
        @click.stop="remove"
      >
        <Trash2 class="size-3.5 shrink-0" stroke-width="2" />
      </button>
    </div>
  </EdgeLabelRenderer>
</template>

<script setup>
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useVueFlow } from '@vue-flow/core'
import { Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  sourcePosition: { type: String, required: true },
  targetPosition: { type: String, required: true },
  markerEnd: { type: String, default: undefined },
  markerStart: { type: String, default: undefined },
  style: { type: Object, default: undefined },
  interactionWidth: { type: Number, default: 20 },
  selected: { type: Boolean, default: false },
})

const { removeEdges } = useVueFlow()

const smooth = computed(() =>
  getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  }),
)

const path = computed(() => smooth.value[0])
const labelX = computed(() => smooth.value[1])
const labelY = computed(() => smooth.value[2])

const labelStyle = computed(() => ({
  position: 'absolute',
  zIndex: 10,
  transform: `translate(-50%, -50%) translate(${labelX.value}px,${labelY.value}px)`,
  pointerEvents: 'all',
}))

function remove() {
  removeEdges(props.id)
}
</script>
