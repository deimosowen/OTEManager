<template>
  <div :class="compact ? 'space-y-3' : 'space-y-5'">
    <template v-for="field in fields" :key="field.name">
      <div v-if="field.type === 'select'">
        <AppStyledSelect
          v-model="formProps[field.name]"
          class="w-full"
          :label="field.label"
          :label-title="paramLabelTitle(field)"
          :options="field.options || []"
        />
      </div>
      <div v-else-if="field.type === 'template_select'">
        <template v-if="templates.length">
          <AppStyledSelect
            v-model="deploymentTemplateId"
            class="w-full"
            :label="field.label"
            :label-title="paramLabelTitle(field)"
            :options="templateFieldOptions"
            placeholder="Выберите шаблон"
            no-options-message="Нет шаблонов в каталоге"
          />
          <div :class="compact ? 'mt-1.5 flex flex-wrap items-center gap-2 text-xs font-bold' : 'mt-2 flex flex-wrap items-center gap-3 text-xs font-bold'">
            <NuxtLink
              v-if="templateEditHref"
              :to="templateEditHref"
              class="inline-flex items-center gap-1 text-brand hover:underline"
            >
              <ExternalLink class="size-3.5" aria-hidden="true" />
              Открыть шаблон для правки
            </NuxtLink>
            <NuxtLink to="/templates" class="text-slate-500 hover:text-brand hover:underline">Все шаблоны</NuxtLink>
          </div>
        </template>
        <div v-else>
          <AppTooltip :content="paramLabelTitle(field)">
            <template #default="{ describedBy }">
              <label
                :aria-describedby="describedBy || undefined"
                class="mb-1.5 block cursor-help text-sm font-bold text-slate-800 underline decoration-dotted decoration-slate-400 underline-offset-2 hover:decoration-slate-500"
              >
                {{ field.label }} (YAML)
              </label>
            </template>
          </AppTooltip>
          <AppTextareaWithLineNumbers
            v-model="formProps[field.name]"
            :spellcheck="false"
            :min-height-class="compact ? 'min-h-[220px]' : 'min-h-[280px]'"
            placeholder="metadata:&#10;  tag: &quot;%metadata.tag%&quot;&#10;..."
          />
          <p :class="compact ? 'mt-1.5 text-[11px] font-semibold text-slate-500' : 'mt-2 text-xs font-semibold text-slate-500'">
            В каталоге нет шаблонов.
            <NuxtLink to="/templates/new" class="font-bold text-brand hover:underline">Создать шаблон</NuxtLink>
            или
            <NuxtLink to="/templates" class="font-bold text-brand hover:underline">список шаблонов</NuxtLink>
          </p>
        </div>
      </div>
      <div v-else>
        <AppInput
          v-model="formProps[field.name]"
          :label="field.label"
          :label-title="paramLabelTitle(field)"
          :placeholder="field.placeholder || ''"
          autocomplete="off"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ExternalLink } from 'lucide-vue-next'

/**
 * @param {{ name: string, hint?: string }} field
 */
function paramLabelTitle(field) {
  const name = field.name
  const hint = sanitizeHint(name, field.hint || '')
  const base = `Параметр TeamCity: ${name}`
  if (!hint) return base
  return `${base}\n\n${hint}`
}

/**
 * @param {string} paramName
 * @param {string} rawHint
 */
function sanitizeHint(paramName, rawHint) {
  const h = typeof rawHint === 'string' ? rawHint.trim() : ''
  if (!h) return ''
  const n = String(paramName || '').trim()
  if (!n) return h
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let out = h
  const patterns = [
    new RegExp(`^TeamCity:\\s*${esc}\\s*[—\\-–]\\s*`, 'i'),
    new RegExp(`^TeamCity:\\s*${esc}\\s*$`, 'i'),
    new RegExp(`^Параметр\\s+TeamCity:\\s*${esc}\\s*[—\\-–]\\s*`, 'i'),
    new RegExp(`^Параметр\\s+TeamCity:\\s*${esc}\\s*$`, 'i'),
    new RegExp(`^В\\s+TeamCity\\s+в\\s+параметр\\s+${esc}\\s+`, 'i'),
  ]
  for (const re of patterns) {
    out = out.replace(re, '').trim()
  }
  return out.trim()
}

/** @type {{ name: string, label: string, type?: string, required?: boolean, placeholder?: string, hint?: string, options?: { value: string, label: string }[] }[]} */
defineProps({
  fields: { type: Array, default: () => [] },
  /** Реактивный объект полей формы (имена = ключи TeamCity). */
  formProps: { type: Object, required: true },
  templates: { type: Array, default: () => [] },
  templateFieldOptions: { type: Array, default: () => [] },
  templateEditHref: { type: String, default: '' },
  /** Чуть плотнее вертикальные отступы между полями (страница создания OTE). */
  compact: { type: Boolean, default: false },
})

const deploymentTemplateId = defineModel('deploymentTemplateId', { type: String, default: '' })
</script>
