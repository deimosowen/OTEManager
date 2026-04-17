<template>
  <div
    class="mb-5 flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    <div class="relative min-w-[140px] max-w-[240px] shrink-0 basis-[min(100%,200px)] sm:basis-[220px]">
      <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        v-model="local.query"
        type="search"
        placeholder="Поиск..."
        class="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
        @input="emitFilters"
      />
    </div>

    <AppSelect
      class="w-[148px] shrink-0 sm:w-[160px]"
      :model-value="local.product"
      :options="productOpts"
      @update:model-value="(v) => ((local.product = v), emitFilters())"
    />
    <AppSelect
      class="w-[148px] shrink-0 sm:w-[160px]"
      :model-value="local.status"
      :options="statusOpts"
      @update:model-value="(v) => ((local.status = v), emitFilters())"
    />
    <AppSelect
      class="w-[158px] shrink-0 sm:w-[172px]"
      :model-value="local.type"
      :options="typeOpts"
      @update:model-value="(v) => ((local.type = v), emitFilters())"
    />

    <label
      class="flex shrink-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-600 sm:px-3"
    >
      <input v-model="local.onlyMine" type="checkbox" class="size-4 shrink-0 accent-brand" @change="emitFilters" />
      Мои окружения
    </label>

    <button
      type="button"
      class="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-rose-300 hover:text-rose-600 sm:px-4"
      @click="reset"
    >
      Сбросить
    </button>
  </div>
</template>

<script setup>
import { reactive, watch, computed } from 'vue'
import { Search } from 'lucide-vue-next'
import { FILTER_STATUS_OPTIONS } from '~/constants/ote'

const props = defineProps({
  modelValue: { type: Object, required: true },
  productOptions: { type: Array, default: () => [] },
  typeOptions: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const local = reactive({
  query: props.modelValue.query,
  product: props.modelValue.product,
  status: props.modelValue.status,
  type: props.modelValue.type,
  onlyMine: props.modelValue.onlyMine,
})

watch(
  () => props.modelValue,
  (v) => {
    local.query = v.query
    local.product = v.product
    local.status = v.status
    local.type = v.type
    local.onlyMine = v.onlyMine
  },
  { deep: true },
)

const productOpts = computed(() => [
  { value: '', label: 'Продукт' },
  ...props.productOptions.filter(Boolean).map((p) => ({ value: p, label: p })),
])

const typeOpts = computed(() => [
  { value: '', label: 'Тип окружения' },
  ...props.typeOptions.filter(Boolean).map((p) => ({ value: p, label: p })),
])

const statusOpts = computed(() => FILTER_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })))

function emitFilters() {
  emit('update:modelValue', { ...local })
}

function reset() {
  local.query = ''
  local.product = ''
  local.status = ''
  local.type = ''
  local.onlyMine = false
  emitFilters()
}
</script>
