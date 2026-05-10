<template>
  <div>
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <h1 class="text-[22px] font-extrabold text-slate-900">Песочница редактора</h1>
        <p class="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
          Демонстрационный пример графа без сохранения в базу. Запустите тур — он по шагам покажет возможности редактора на этом примере.
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <AppButton type="button" variant="secondary" size="sm" @click="runTour">Запустить тур</AppButton>
        <NuxtLink
          to="/automation"
          class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
        >
          К списку сценариев
        </NuxtLink>
      </div>
    </div>

    <ClientOnly>
      <AutomationWorkflowBuilder
        demo-sandbox
        scenario-id="sandbox"
        :initial-graph="AUTOMATION_TUTORIAL_SAMPLE_GRAPH"
      />
      <template #fallback>
        <div
          class="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
          aria-busy="true"
          aria-label="Загрузка редактора"
        >
          <div class="h-14 border-b border-slate-100 bg-slate-50/80" />
          <div class="flex flex-1 gap-4 p-4">
            <div class="hidden w-[300px] shrink-0 flex-col gap-3 lg:flex">
              <div class="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div class="h-24 animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div class="min-h-[420px] flex-1 animate-pulse rounded-xl bg-gradient-to-br from-slate-100 to-slate-50" />
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
import AppButton from '~/components/ui/AppButton.vue'
import AutomationWorkflowBuilder from '~/components/automation/AutomationWorkflowBuilder.vue'
import { runAutomationBuilderTutorialTour } from '~/tours/automation/builder-tutorial-tour.js'
import { AUTOMATION_TUTORIAL_SAMPLE_GRAPH } from '~/tours/automation/tutorial-sample-graph.js'

function runTour() {
  runAutomationBuilderTutorialTour()
}
</script>
