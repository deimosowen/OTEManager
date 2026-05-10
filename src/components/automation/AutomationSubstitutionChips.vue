<template>
  <details v-if="groups.length" open class="rounded-xl border border-slate-100 bg-slate-50/70 ring-1 ring-slate-100/80">
    <summary
      class="cursor-pointer list-none px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500 select-none [&::-webkit-details-marker]:hidden"
    >
      Подстановки
    </summary>
    <div class="space-y-2 border-t border-slate-100/90 px-3 pb-3 pt-2">
      <div
        v-for="g in groups"
        :key="g.nodeId"
        class="rounded-lg border border-slate-100/90 bg-white/90 px-2.5 py-2 shadow-sm"
      >
        <p class="mb-1.5 truncate text-[11px] font-bold text-slate-700" :title="g.title">{{ g.title }}</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="f in g.fields"
            :key="f.key"
            type="button"
            class="rounded-md border border-slate-100 bg-slate-50/90 px-2 py-1 text-left text-[11px] font-semibold leading-tight text-slate-800 transition hover:border-brand/30 hover:bg-brand-light/50"
            :title="f.snippet"
            @mousedown.prevent
            @click="$emit('insert', f.snippet)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup>
defineProps({
  /** Группы из `buildUpstreamSubstitutionGroups` */
  groups: { type: Array, default: () => [] },
})

defineEmits(['insert'])
</script>
