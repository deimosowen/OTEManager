<template>
  <AppModal
    v-model="openProxy"
    labelledby="automation-block-config-title"
    :accent="accent"
    :max-width-class="modalMaxWidthClass"
    panel-class="max-h-[min(92vh,56rem)] flex flex-col"
    content-class="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
  >
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="shrink-0 px-6 pb-2 pt-5 sm:px-7 sm:pt-6">
      <div class="mb-5 flex items-start gap-3">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-inner"
          :class="headerIconWrap"
        >
          <component :is="headerIcon" class="size-5 text-white" stroke-width="2" />
        </div>
        <div class="min-w-0">
          <h2 id="automation-block-config-title" class="text-lg font-extrabold tracking-tight text-slate-900">
            {{ paletteItem?.title || 'Настройка блока' }}
          </h2>
          <p class="mt-1 text-sm font-medium leading-relaxed text-slate-500">
            {{ paletteItem?.subtitle }}
          </p>
          <p v-if="mode === 'edit'" class="mt-2 text-xs font-bold text-amber-800">
            Редактирование блока на холсте
          </p>
        </div>
      </div>
      </div>

      <div
        class="automation-block-config-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-4 sm:px-7"
        @focusin.capture="onSubstFieldFocusIn"
      >
      <AutomationSubstitutionChips
        v-if="substitutionGroups.length"
        class="mb-4"
        :groups="substitutionGroups"
        @insert="insertSubstitutionSnippet"
      />
      <p
        v-else-if="substitutionPlaceholderHint"
        class="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/90 px-3 py-2 text-[11px] font-medium leading-relaxed text-slate-500"
      >
        Подстановки из предыдущих шагов появятся здесь после того, как на холсте соедините этот блок с блоками, у которых есть выходы (условие, HTTP, шаблон, ВМ и т.д.).
      </p>
      <!-- Расписание: в текстах только то, что нужно пользователю (без деталей реализации). -->
      <div v-if="modalKind === 'schedule'" class="space-y-5">
        <p class="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-slate-600 ring-1 ring-slate-100">
          Отметьте дни недели и время, когда сценарий должен стартовать сам. Ориентир —
          <span class="font-bold text-slate-800">часы и календарь так же, как в вашем профиле</span>
          (сейчас <span class="font-bold text-slate-700">{{ profileTimezoneShort }}</span>). Поменять пояс можно в разделе «Профиль». Если добавить несколько времён — будет несколько запусков за одни сутки.
        </p>
        <div>
          <p class="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Тип дней</p>
          <div class="flex gap-2 rounded-xl bg-slate-100/90 p-1 ring-1 ring-slate-200/80">
            <button
              v-for="opt in dayModeOptions"
              :key="opt.value"
              type="button"
              class="flex-1 rounded-lg px-3 py-2.5 text-center text-xs font-bold transition"
              :class="
                schedule.dayMode === opt.value
                  ? 'bg-white text-teal-800 shadow-sm ring-1 ring-teal-200'
                  : 'text-slate-500 hover:text-slate-700'
              "
              @click="schedule.dayMode = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="mt-2 text-xs leading-relaxed text-slate-400">
            <template v-if="schedule.dayMode === 'working'">Выходные и праздники по календарю РФ — без запуска.</template>
            <template v-else>Отметьте дни недели ниже.</template>
          </p>
        </div>

        <div v-if="schedule.dayMode !== 'working'">
          <p class="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Дни недели</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="d in WEEKDAY_OPTIONS"
              :key="d.value"
              type="button"
              class="min-w-[2.75rem] rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition"
              :class="
                schedule.weekdays.includes(d.value)
                  ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
              "
              @click="toggleWeekday(schedule.weekdays, d.value)"
            >
              {{ d.short }}
            </button>
          </div>
        </div>

        <div>
          <p class="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Время запуска</p>
          <div class="space-y-2.5">
            <div
              v-for="(_t, idx) in schedule.times"
              :key="idx"
              class="flex flex-wrap items-center gap-2"
            >
              <span class="w-6 text-center text-[11px] font-bold tabular-nums text-slate-400">{{ idx + 1 }}.</span>
              <AutomationTimePair v-model="schedule.times[idx]" />
              <button
                v-if="schedule.times.length > 1"
                type="button"
                class="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Убрать время"
                @click="removeScheduleTime(idx)"
              >
                <Trash2 class="size-4" stroke-width="2" />
              </button>
            </div>
          </div>
          <AppButton
            v-if="schedule.times.length < SCHEDULE_TIMES_MAX"
            class="mt-3"
            variant="secondary"
            size="sm"
            type="button"
            @click="addScheduleTime"
          >
            <Plus class="size-4 shrink-0" stroke-width="2" aria-hidden="true" />
            Ещё одно время
          </AppButton>
          <p class="mt-2 text-xs leading-relaxed text-slate-400">
            Не больше {{ SCHEDULE_TIMES_MAX }} моментов в сутки; минуты выбираются с шагом 5.
          </p>
        </div>
      </div>

      <!-- Ручной запуск: узел на холсте + кнопка на главной -->
      <div v-else-if="modalKind === 'manual'" class="space-y-4">
        <p class="text-xs font-medium leading-relaxed text-slate-500">
          На холсте появится узел триггера; на главной странице — кнопка запуска рядом с «Все окружения» и «Создать OTE».
        </p>
        <div>
          <AppInput
            v-model="manualHome.buttonLabel"
            label="Подпись на кнопке"
            placeholder="Текст на кнопке"
            native-type="text"
          />
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <AppSelect
              v-model="manualHome.buttonVariant"
              label="Стиль"
              :options="MANUAL_HOME_VARIANT_OPTIONS"
              panel-max-height-px="260"
            />
            <AppSelect
              v-model="manualHome.buttonIconKey"
              label="Иконка"
              :options="manualIconSelectOptions"
              panel-min-width-px="220"
              panel-max-height-px="280"
            />
          </div>
        </div>
      </div>

      <!-- Условие If/Else: ветка «Да»/«Нет» по снимку каталога YC на момент запуска -->
      <div v-else-if="modalKind === 'if_else'" class="space-y-4">
        <AppInput
          v-model="ifElseCfg.blockTitle"
          label="Название блока на холсте"
          placeholder="Например: Стенд demo запущен?"
          native-type="text"
        />
        <AppSelect
          v-model="ifElseCfg.authorScope"
          label="Чьи среды смотреть"
          :options="IF_ELSE_AUTHOR_OPTIONS"
          panel-max-height-px="260"
        />
        <AppSelect
          v-model="ifElseCfg.tagScope"
          label="Тег окружения"
          :options="IF_ELSE_TAG_SCOPE_OPTIONS"
          panel-max-height-px="220"
        />
        <AppInput
          v-show="ifElseCfg.tagScope === 'specific'"
          v-model="ifElseCfg.tagValue"
          label="Значение тега"
          placeholder="Как в колонке Tag в списке OTE"
          native-type="text"
        />
        <AppSelect
          v-model="ifElseCfg.machinePredicate"
          label="Условие"
          :options="IF_ELSE_MACHINE_OPTIONS"
          panel-max-height-px="300"
        />
      </div>

      <!-- Уведомление в колокольчик -->
      <div v-else-if="modalKind === 'notify_bell'" class="space-y-4">
        <AppInput
          v-model="notifyBell.title"
          label="Заголовок"
          placeholder="Например: Сценарий завершён"
          native-type="text"
        />
        <div>
          <label class="mb-1.5 block text-sm font-bold text-slate-800">Текст (необязательно)</label>
          <textarea
            v-model="notifyBell.body"
            rows="3"
            class="w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
            placeholder="Дополнительное описание"
          />
        </div>
        <AppInput
          v-model="notifyBell.href"
          label="Ссылка при клике (необязательно)"
          placeholder="/automation или полный URL"
          native-type="text"
        />
      </div>

      <!-- Ожидание завершения сборки TeamCity (после постановки в очередь) -->
      <div v-else-if="modalKind === 'wait_teamcity'" class="space-y-4">
        <p class="text-xs font-medium leading-relaxed text-slate-500">
          Вход соедините с блоком, который ставит сборку в TeamCity («Создать из шаблона» или запуск/остановка ВМ).
        </p>
        <AppInput
          v-model="waitTcCfg.blockTitle"
          label="Название блока на холсте"
          placeholder="Например: Дождаться создания OTE"
          native-type="text"
        />
        <AppSelect
          v-model="waitTcTimeoutSelect"
          label="Максимальное время ожидания"
          :options="WAIT_TC_TIMEOUT_OPTIONS"
          panel-max-height-px="320"
        />
      </div>

      <!-- Шаблон создания OTE (как на странице создания: список + параметры в сценарии) -->
      <div v-else-if="modalKind === 'create_template'" class="space-y-4">
        <div
          v-if="createTplFetchError"
          class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
        >
          {{ createTplFetchError }}
        </div>
        <div v-else-if="createTplLoading" class="text-sm font-semibold text-slate-500">Загрузка шаблонов…</div>
        <template v-else>
          <AppSelect
            v-model="selectedCreateTemplateId"
            label="Шаблон сборки"
            class="w-full min-w-0"
            :options="createTemplateSelectOptions"
            placeholder="Выберите шаблон"
            :panel-min-width-px="280"
            :panel-max-height-px="320"
          />
          <p
            v-if="createTemplateGroupsLine"
            class="text-[12px] font-semibold leading-snug text-slate-600"
          >
            <span class="text-slate-500">Доступно группам:</span>
            {{ createTemplateGroupsLine }}
          </p>
          <div v-if="createTplDetailLoading" class="text-xs font-semibold text-slate-500">
            Загрузка параметров шаблона…
          </div>
          <div
            v-else-if="createTemplateOverrideRows.length"
            class="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 ring-1 ring-slate-100"
          >
            <p class="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Параметры</p>
            <AppInput
              v-for="row in createTemplateOverrideRows"
              :key="row.key"
              v-model="createTplParamOverrides[row.key]"
              :label="row.key"
              native-type="text"
            />
          </div>
          <p v-else-if="selectedCreateTemplateId && !createTplDetailLoading" class="text-xs text-slate-500">
            У этого шаблона нет настраиваемых параметров в каталоге.
          </p>
        </template>
      </div>

      <!-- Запуск / остановка ВМ -->
      <div v-else-if="modalKind === 'vm_power'" class="space-y-4">
        <AppInput
          v-model="vmPower.blockTitle"
          label="Название блока на холсте"
          placeholder="Например: Запуск ВМ"
          native-type="text"
        />
        <AppSelect
          v-model="vmPower.targetMode"
          label="Кого затронуть"
          :options="VM_POWER_TARGET_OPTIONS"
          panel-max-height-px="240"
        />
        <AppInput
          v-show="vmPower.targetMode === 'tag'"
          v-model="vmPower.tagValue"
          label="Имя среды (тег)"
          placeholder="Например: demo-staging"
          native-type="text"
        />
      </div>

      <!-- HTTP-запрос -->
      <div v-else-if="modalKind === 'http_request'" class="space-y-4">
        <AppInput
          v-model="httpReq.blockTitle"
          label="Название блока на холсте"
          placeholder="Например: Вебхук статуса"
          native-type="text"
        />
        <div class="grid gap-3 sm:grid-cols-3">
          <AppSelect v-model="httpReq.method" label="Метод" :options="HTTP_METHOD_OPTIONS" panel-max-height-px="280" />
          <div class="sm:col-span-2">
            <AppInput v-model="httpReq.timeoutMs" label="Таймаут (мс)" placeholder="30000" native-type="text" />
          </div>
        </div>
        <AppInput v-model="httpReq.url" label="URL" placeholder="https://api.example.com/hook" native-type="text" />
        <div>
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-extrabold uppercase tracking-wide text-slate-400">Заголовки</span>
            <AppButton type="button" variant="secondary" size="sm" @click="addHttpHeaderRow">
              <Plus class="size-4 shrink-0" stroke-width="2" />
              Добавить
            </AppButton>
          </div>
          <div class="space-y-2">
            <div v-for="(h, idx) in httpReq.headers" :key="idx" class="flex flex-wrap gap-2">
              <AppInput v-model="h.key" class="min-w-[140px] flex-1" label="Key" placeholder="Authorization" native-type="text" />
              <AppInput v-model="h.value" class="min-w-[160px] flex-[2]" label="Value" placeholder="Bearer …" native-type="text" />
              <div class="flex items-end">
                <button
                  type="button"
                  class="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Удалить заголовок"
                  @click="removeHttpHeaderRow(idx)"
                >
                  <Trash2 class="size-4" stroke-width="2" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-bold text-slate-800">Тело запроса</label>
          <textarea
            v-model="httpReq.body"
            rows="5"
            class="w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-800 placeholder:text-slate-300 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
            placeholder="Только для POST/PUT/PATCH/DELETE"
          />
        </div>
      </div>

      <p v-if="errorHint" class="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 ring-1 ring-rose-100">
        {{ errorHint }}
      </p>
      </div>

      <div class="shrink-0 border-t border-slate-100 px-6 pb-6 pt-4 sm:px-7 sm:pb-7">
        <div class="flex flex-wrap justify-end gap-2">
          <AppButton variant="secondary" size="md" @click="close">Отмена</AppButton>
          <AppButton size="md" @click="submit">{{ primaryActionLabel }}</AppButton>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import {
  Bell,
  CalendarClock,
  GitBranch,
  Globe,
  Layers,
  Play,
  Plus,
  Power,
  PowerOff,
  Rocket,
  Sparkles,
  Timer,
  Trash2,
  Zap,
} from 'lucide-vue-next'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppSelect from '~/components/ui/AppSelect.vue'
import AutomationSubstitutionChips from '~/components/automation/AutomationSubstitutionChips.vue'
import AutomationTimePair from '~/components/automation/AutomationTimePair.vue'
import { useManualHomeLaunch } from '~/composables/useManualHomeLaunch.js'
import { useToast } from '~/composables/useToast'
import { useUserTimeFormat } from '~/composables/useUserTimeFormat.js'
import { formatTimezoneShortRu } from '~/constants/automation-schedule.js'
import {
  IF_ELSE_AUTHOR_OPTIONS,
  IF_ELSE_MACHINE_OPTIONS,
  IF_ELSE_TAG_SCOPE_OPTIONS,
  normalizeIfElseConfig,
} from '~/constants/automation-if-else.js'
import { VM_POWER_TARGET_OPTIONS, normalizeVmPowerConfig } from '~/constants/automation-vm-power.js'
import { normalizeWaitTeamCityConfig } from '~/constants/automation-wait-teamcity.js'
import {
  MANUAL_HOME_ICON_OPTIONS,
  MANUAL_HOME_VARIANT_OPTIONS,
  cloneManualHomeFormState,
  normalizeManualHomeConfig,
} from '~/constants/automation-manual-home.js'
import { useAuthStore } from '~/stores/auth'
import { buildUpstreamSubstitutionGroups } from '~/utils/automation-substitution-catalog.js'
import { sortTemplatesForCreate } from '~/utils/ote-create-templates-sort.js'

const auth = useAuthStore()
const toast = useToast()
const { manualHomeLaunch } = useManualHomeLaunch()
const { timeZone } = useUserTimeFormat()

const profileTimezoneIana = computed(() => String(timeZone.value || 'UTC').trim() || 'UTC')
const profileTimezoneShort = computed(() => formatTimezoneShortRu(profileTimezoneIana.value))

const MANUAL_SELECT_ICON_COMPONENTS = {
  Play,
  Zap,
  Rocket,
  Power,
  PowerOff,
  Plus,
  Bell,
  Sparkles,
  Layers,
}

const WEEKDAY_OPTIONS = [
  { value: 1, short: 'Пн' },
  { value: 2, short: 'Вт' },
  { value: 3, short: 'Ср' },
  { value: 4, short: 'Чт' },
  { value: 5, short: 'Пт' },
  { value: 6, short: 'Сб' },
  { value: 7, short: 'Вс' },
]

const SCHEDULE_TIMES_MAX = 12

const HTTP_METHOD_OPTIONS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
]

const WAIT_TC_TIMEOUT_OPTIONS = [
  { value: '15', label: '15 минут' },
  { value: '30', label: '30 минут' },
  { value: '60', label: '1 час' },
  { value: '120', label: '2 часа' },
  { value: '180', label: '3 часа' },
  { value: '360', label: '6 часов' },
  { value: '720', label: '12 часов' },
  { value: '1440', label: '24 часа' },
]

const dayModeOptions = [
  { value: 'working', label: 'Рабочие дни · РФ' },
  { value: 'calendar', label: 'Календарные' },
]

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Элемент палитры с полем configModal */
  paletteItem: { type: Object, default: null },
  /** @type {'add' | 'edit'} */
  mode: { type: String, default: 'add' },
  /** Конфигурация блока при редактировании */
  initialConfig: { type: Object, default: null },
  /** Узлы Vue Flow (для подстановок из предков) */
  graphNodes: { type: Array, default: () => [] },
  graphEdges: { type: Array, default: () => [] },
  /** id узла, для которого открыта модалка — цель обхода рёбер «вверх» */
  substitutionTargetNodeId: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const openProxy = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const modalKind = computed(() => props.paletteItem?.configModal || '')

const SUBSTITUTION_MODAL_KINDS = new Set(['notify_bell', 'create_template', 'http_request', 'vm_power', 'if_else'])

const substitutionGroups = computed(() => {
  if (!SUBSTITUTION_MODAL_KINDS.has(modalKind.value)) return []
  return buildUpstreamSubstitutionGroups(
    props.graphNodes || [],
    props.graphEdges || [],
    props.substitutionTargetNodeId,
  )
})

/** Нет связей к блокам с выходами — показываем короткую подсказку вместо пустого места */
const substitutionPlaceholderHint = computed(
  () => SUBSTITUTION_MODAL_KINDS.has(modalKind.value) && substitutionGroups.value.length === 0,
)

/** Последнее поле ввода в модалке (клик по чипу уводит фокус — без этого вставка не сработает). */
const lastSubstField = ref(/** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (null))

/** @param {FocusEvent} ev */
function onSubstFieldFocusIn(ev) {
  const t = ev.target
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
    lastSubstField.value = t
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) lastSubstField.value = null
  },
)

/** @param {string} snippet */
function insertSubstitutionSnippet(snippet) {
  const root = document.querySelector('.automation-block-config-scroll')
  let ta = lastSubstField.value
  if (!ta || !root?.contains(ta)) {
    const ae = document.activeElement
    if (
      ae instanceof HTMLInputElement ||
      ae instanceof HTMLTextAreaElement
    ) {
      ta = ae
    }
  }
  if (!ta || !root?.contains(ta)) {
    toast.show('Кликните сначала в поле ввода (заголовок, URL, тело запроса…), затем снова на подстановку.', 'info')
    return
  }
  const v0 = String(ta.value || '')
  const start = typeof ta.selectionStart === 'number' ? ta.selectionStart : v0.length
  const end = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : start
  const next = v0.slice(0, start) + snippet + v0.slice(end)
  ta.value = next
  ta.dispatchEvent(new Event('input', { bubbles: true }))
  const pos = start + snippet.length
  if (typeof ta.setSelectionRange === 'function') ta.setSelectionRange(pos, pos)
  const field = ta
  void nextTick(() => {
    field.focus()
    if (typeof field.setSelectionRange === 'function') field.setSelectionRange(pos, pos)
  })
}

const primaryActionLabel = computed(() => (props.mode === 'edit' ? 'Сохранить' : 'Добавить на холст'))

const modalMaxWidthClass = computed(() => {
  const k = modalKind.value
  if (k === 'create_template' || k === 'http_request' || k === 'vm_power') return 'max-w-[640px]'
  if (k === 'manual' || k === 'if_else') return 'max-w-[560px]'
  return 'max-w-[480px]'
})

const accent = computed(() => {
  const k = props.paletteItem?.kind
  if (k === 'trigger') return 'teal'
  if (k === 'condition') return 'brand'
  if (k === 'wait') return 'indigo'
  if (k === 'action') return 'emerald'
  return 'brand'
})

const headerIconWrap = computed(() => {
  const k = props.paletteItem?.kind
  if (k === 'trigger') return 'bg-gradient-to-br from-teal-500 to-emerald-600'
  if (k === 'condition') return 'bg-gradient-to-br from-amber-500 to-orange-600'
  if (k === 'wait') return 'bg-gradient-to-br from-violet-500 to-purple-700'
  if (k === 'action') return 'bg-gradient-to-br from-brand to-brand-dark'
  return 'bg-gradient-to-br from-slate-500 to-slate-700'
})

const headerIcon = computed(() => {
  const key = props.paletteItem?.iconKey
  const map = {
    Bell,
    CalendarClock,
    GitBranch,
    Globe,
    Play,
    Plus,
    Power,
    PowerOff,
    Timer,
  }
  return map[key] || Layers
})

const schedule = reactive({
  dayMode: /** @type {'working'|'calendar'} */ ('calendar'),
  weekdays: /** @type {number[]} */ ([1, 2, 3, 4, 5]),
  /** @type {string[]} HH:mm, шаг 5 мин — как минуты в cron */
  times: ['09:00'],
})

const manualHome = reactive(cloneManualHomeFormState())

/** Блок «Создать из шаблона» */
const createTplTemplates = ref(/** @type {any[]} */ ([]))
const createTplLoading = ref(false)
const createTplFetchError = ref('')
const selectedCreateTemplateId = ref('')
const createTplDetail = ref(/** @type {any | null} */ (null))
const createTplDetailLoading = ref(false)
const createTplParamOverrides = reactive(/** @type {Record<string, string>} */ ({}))
/** Сохранённые в сценарии переопределения — подмешиваются к умолчаниям шаблона при открытии */
const createTplStickyOverrides = reactive(/** @type {Record<string, string>} */ ({}))

const httpReq = reactive({
  blockTitle: 'HTTP-запрос',
  method: 'GET',
  url: '',
  /** @type {{ key: string, value: string }[]} */
  headers: [{ key: '', value: '' }],
  body: '',
  timeoutMs: '30000',
})

function resetHttpReq() {
  httpReq.blockTitle = 'HTTP-запрос'
  httpReq.method = 'GET'
  httpReq.url = ''
  httpReq.headers = [{ key: '', value: '' }]
  httpReq.body = ''
  httpReq.timeoutMs = '30000'
}

function addHttpHeaderRow() {
  httpReq.headers.push({ key: '', value: '' })
}

/** @param {number} idx */
function removeHttpHeaderRow(idx) {
  if (httpReq.headers.length <= 1) {
    httpReq.headers[0].key = ''
    httpReq.headers[0].value = ''
    return
  }
  httpReq.headers.splice(idx, 1)
}

function resetCreateTemplateBlock() {
  createTplTemplates.value = []
  createTplLoading.value = false
  createTplFetchError.value = ''
  selectedCreateTemplateId.value = ''
  createTplDetail.value = null
  createTplDetailLoading.value = false
  for (const k of Object.keys(createTplStickyOverrides)) delete createTplStickyOverrides[k]
  for (const k of Object.keys(createTplParamOverrides)) delete createTplParamOverrides[k]
}

function replaceCreateTplParamOverrides(next) {
  for (const k of Object.keys(createTplParamOverrides)) delete createTplParamOverrides[k]
  Object.assign(createTplParamOverrides, next)
}

function applyParamsFromDetailAndSticky(detail, sticky) {
  const p = detail?.params && typeof detail.params === 'object' ? detail.params : {}
  /** @type {Record<string, string>} */
  const next = {}
  for (const [k, v] of Object.entries(p)) {
    const kk = String(k || '').trim()
    if (!kk) continue
    next[kk] = v == null ? '' : String(v)
  }
  const st = sticky && typeof sticky === 'object' ? sticky : {}
  for (const kk of Object.keys(next)) {
    if (Object.prototype.hasOwnProperty.call(st, kk)) next[kk] = st[kk] == null ? '' : String(st[kk])
  }
  replaceCreateTplParamOverrides(next)
}

async function fetchCreateTemplateDetail(id) {
  const sid = String(id || '').trim()
  if (!sid) {
    createTplDetail.value = null
    replaceCreateTplParamOverrides({})
    return
  }
  createTplDetailLoading.value = true
  try {
    const res = await $fetch(`/api/ote/build-templates/${encodeURIComponent(sid)}`, { credentials: 'include' })
    createTplDetail.value = res?.template || null
    applyParamsFromDetailAndSticky(createTplDetail.value, createTplStickyOverrides)
  } catch {
    createTplDetail.value = null
    replaceCreateTplParamOverrides({})
  } finally {
    createTplDetailLoading.value = false
  }
}

async function loadCreateTemplateList() {
  createTplLoading.value = true
  createTplFetchError.value = ''
  try {
    const bt = await $fetch('/api/ote/build-templates', { credentials: 'include' })
    const raw = Array.isArray(bt?.templates) ? bt.templates : []
    createTplTemplates.value = sortTemplatesForCreate(raw, auth.user?.group?.id)
  } catch (e) {
    createTplFetchError.value = e?.data?.message || e?.message || String(e)
    createTplTemplates.value = []
  } finally {
    createTplLoading.value = false
  }
}

const createTemplateSelectOptions = computed(() =>
  createTplTemplates.value.map((t) => ({
    value: String(t.id),
    label: String(t.name || `#${t.id}`),
    isPersonal: Boolean(t.isPersonal),
  })),
)

const createTemplateOverrideRows = computed(() => {
  const t = createTplDetail.value
  const p = t && t.params && typeof t.params === 'object' ? t.params : {}
  return Object.keys(p)
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .map((key) => ({ key }))
})

const createTemplateGroupsLine = computed(() => {
  const id = selectedCreateTemplateId.value
  const t = createTplTemplates.value.find((x) => String(x.id) === String(id))
  if (!t || t.isPersonal) return ''
  return String(t.groupsPreview || '').trim()
})

const ifElseCfg = reactive({
  blockTitle: 'Новое условие',
  authorScope: /** @type {'mine'|'any'} */ ('mine'),
  tagScope: /** @type {'any'|'specific'} */ ('any'),
  tagValue: '',
  machinePredicate: /** @type {'running'|'stopped'|'exists'|'missing'} */ ('running'),
})

const vmPower = reactive({
  blockTitle: '',
  /** @type {'mine'|'tag'} */
  targetMode: 'mine',
  tagValue: '',
})

const notifyBell = reactive({
  title: '',
  body: '',
  href: '',
})

const waitTcCfg = reactive({
  blockTitle: 'Ожидание TeamCity',
})

/** @type {import('vue').Ref<string>} */
const waitTcTimeoutSelect = ref('180')

const manualIconSelectOptions = computed(() =>
  MANUAL_HOME_ICON_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
    icon: o.value && MANUAL_SELECT_ICON_COMPONENTS[o.value] ? MANUAL_SELECT_ICON_COMPONENTS[o.value] : undefined,
  })),
)

const errorHint = computed(() => {
  if (!props.modelValue || !props.paletteItem) return ''
  if (modalKind.value === 'schedule') {
    if (!schedule.weekdays.length) return 'Выберите хотя бы один день недели.'
    if (!schedule.times.length) return 'Добавьте хотя бы одно время запуска.'
  }
  if (modalKind.value === 'manual' && !String(manualHome.buttonLabel || '').trim()) {
    return 'Укажите подпись кнопки.'
  }
  if (modalKind.value === 'if_else' && !String(ifElseCfg.blockTitle || '').trim()) {
    return 'Укажите название блока условия.'
  }
  if (
    modalKind.value === 'if_else' &&
    ifElseCfg.tagScope === 'specific' &&
    !String(ifElseCfg.tagValue || '').trim()
  ) {
    return 'Укажите значение тега или переключите «Любой тег».'
  }
  if (modalKind.value === 'notify_bell' && !String(notifyBell.title || '').trim()) {
    return 'Укажите заголовок уведомления.'
  }
  if (modalKind.value === 'wait_teamcity' && !String(waitTcCfg.blockTitle || '').trim()) {
    return 'Укажите название блока ожидания.'
  }
  if (modalKind.value === 'create_template') {
    if (createTplFetchError.value) return ''
    if (!createTplLoading.value && !createTplTemplates.value.length) return 'Нет доступных шаблонов сборки.'
    if (!String(selectedCreateTemplateId.value || '').trim()) return 'Выберите шаблон сборки.'
  }
  if (modalKind.value === 'http_request') {
    if (!String(httpReq.blockTitle || '').trim()) return 'Укажите название блока на холсте.'
    if (!String(httpReq.url || '').trim()) return 'Укажите URL.'
    const to = Number(httpReq.timeoutMs)
    if (!Number.isFinite(to) || to < 1000 || to > 120000) return 'Таймаут: число от 1000 до 120000 мс.'
  }
  if (modalKind.value === 'vm_power') {
    if (!String(vmPower.blockTitle || '').trim()) return 'Укажите название блока на холсте.'
    if (vmPower.targetMode === 'tag' && !String(vmPower.tagValue || '').trim()) {
      return 'Укажите имя среды или переключитесь на «Только мои среды».'
    }
  }
  return ''
})

function toggleWeekday(arr, v) {
  const i = arr.indexOf(v)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(v)
  arr.sort((a, b) => a - b)
}

function addScheduleTime() {
  if (schedule.times.length >= SCHEDULE_TIMES_MAX) return
  const last = schedule.times[schedule.times.length - 1] || '09:00'
  schedule.times.push(last)
}

function removeScheduleTime(idx) {
  if (schedule.times.length <= 1) return
  schedule.times.splice(idx, 1)
}

/** @param {string[]} times */
function normalizeScheduleTimes(times) {
  const uniq = [...new Set(times.map((t) => String(t || '').trim()).filter(Boolean))]
  uniq.sort((a, b) => a.localeCompare(b))
  return uniq
}

function resetForms() {
  schedule.dayMode = 'calendar'
  schedule.weekdays = [1, 2, 3, 4, 5]
  schedule.times = ['09:00']
  Object.assign(manualHome, cloneManualHomeFormState())
  ifElseCfg.blockTitle = 'Новое условие'
  ifElseCfg.authorScope = 'mine'
  ifElseCfg.tagScope = 'any'
  ifElseCfg.tagValue = ''
  ifElseCfg.machinePredicate = 'running'
  vmPower.blockTitle = ''
  vmPower.targetMode = 'mine'
  vmPower.tagValue = ''
  notifyBell.title = ''
  notifyBell.body = ''
  notifyBell.href = ''
  waitTcCfg.blockTitle = 'Ожидание TeamCity'
  waitTcTimeoutSelect.value = '180'
  resetCreateTemplateBlock()
  resetHttpReq()
}

/**
 * @param {string} kind
 * @param {Record<string, unknown>} cfg
 */
function applyInitialConfig(kind, cfg) {
  if (!cfg || typeof cfg !== 'object') {
    resetForms()
    return
  }
  if (kind === 'schedule') {
    schedule.dayMode = cfg.dayMode === 'working' ? 'working' : 'calendar'
    schedule.weekdays = Array.isArray(cfg.weekdays) ? [...cfg.weekdays] : [1, 2, 3, 4, 5]
    const t = Array.isArray(cfg.times) ? cfg.times.map(String).filter(Boolean) : []
    schedule.times = t.length ? [...t] : ['09:00']
    return
  }
  if (kind === 'manual') {
    const n = normalizeManualHomeConfig(cfg)
    const b = n.buttons[0]
    Object.assign(manualHome, cloneManualHomeFormState())
    if (b) {
      manualHome.buttonLabel = b.label
      manualHome.buttonVariant = b.variant
      manualHome.buttonIconKey = b.iconKey
    }
    return
  }
  if (kind === 'if_else') {
    const n = normalizeIfElseConfig(cfg)
    ifElseCfg.blockTitle = n.blockTitle
    ifElseCfg.authorScope = n.authorScope
    ifElseCfg.tagScope = n.tagScope
    ifElseCfg.tagValue = n.tagValue
    ifElseCfg.machinePredicate = n.machinePredicate
    return
  }
  if (kind === 'vm_power') {
    const n = normalizeVmPowerConfig(cfg)
    vmPower.blockTitle = n.blockTitle || String(props.paletteItem?.title || '').trim() || 'ВМ'
    vmPower.targetMode = n.targetMode
    vmPower.tagValue = n.tagValue
    return
  }
  if (kind === 'notify_bell') {
    notifyBell.title = String(cfg.title || '')
    notifyBell.body = String(cfg.body || '')
    notifyBell.href = String(cfg.href || '')
    return
  }
  if (kind === 'wait_teamcity') {
    const n = normalizeWaitTeamCityConfig(cfg)
    waitTcCfg.blockTitle = n.blockTitle
    const tm = String(n.timeoutMinutes)
    waitTcTimeoutSelect.value = WAIT_TC_TIMEOUT_OPTIONS.some((o) => o.value === tm) ? tm : '180'
    return
  }
  if (kind === 'http_request') {
    resetHttpReq()
    httpReq.blockTitle = String(cfg.blockTitle || 'HTTP-запрос').trim() || 'HTTP-запрос'
    const m = String(cfg.method || 'GET').toUpperCase()
    httpReq.method = HTTP_METHOD_OPTIONS.some((o) => o.value === m) ? m : 'GET'
    httpReq.url = String(cfg.url || '')
    const hdrs = Array.isArray(cfg.headers) ? cfg.headers : []
    httpReq.headers = hdrs.length
      ? hdrs.map((h) => ({
          key: String(/** @type {Record<string, unknown>} */ (h).key || ''),
          value: String(/** @type {Record<string, unknown>} */ (h).value || ''),
        }))
      : [{ key: '', value: '' }]
    httpReq.body = String(cfg.body || '')
    httpReq.timeoutMs = String(cfg.timeoutMs != null ? cfg.timeoutMs : 30000)
    return
  }
}

function hydrateManualFromHomeLaunch() {
  const b = manualHomeLaunch.buttons[0]
  if (b) {
    manualHome.buttonLabel = b.label
    manualHome.buttonVariant = b.variant
    manualHome.buttonIconKey = b.iconKey
  }
}

watch(
  () => [props.modelValue, props.mode, props.initialConfig, props.paletteItem?.configModal],
  async () => {
    if (!props.modelValue || !props.paletteItem) return
    const kind = props.paletteItem.configModal || ''

    if (kind === 'create_template') {
      resetForms()
      if (props.mode === 'edit' && props.initialConfig && typeof props.initialConfig === 'object') {
        const po = props.initialConfig.paramOverrides
        if (po && typeof po === 'object') {
          for (const [k, v] of Object.entries(po)) {
            createTplStickyOverrides[String(k)] = v == null ? '' : String(v)
          }
        }
      }
      await loadCreateTemplateList()
      const wantId =
        props.mode === 'edit' && props.initialConfig && props.initialConfig.buildTemplateId != null
          ? String(props.initialConfig.buildTemplateId).trim()
          : ''
      if (wantId && createTplTemplates.value.some((t) => String(t.id) === wantId)) {
        selectedCreateTemplateId.value = wantId
      } else if (createTplTemplates.value.length) {
        selectedCreateTemplateId.value = String(createTplTemplates.value[0].id)
      } else {
        selectedCreateTemplateId.value = ''
      }
      return
    }

    if (props.mode === 'edit' && props.initialConfig != null) {
      applyInitialConfig(kind, props.initialConfig)
      return
    }
    resetForms()
    if (kind === 'manual') hydrateManualFromHomeLaunch()
    if (kind === 'vm_power' && props.paletteItem?.title) {
      vmPower.blockTitle = String(props.paletteItem.title || '').trim()
    }
  },
)

watch(selectedCreateTemplateId, (id) => {
  if (!props.modelValue || props.paletteItem?.configModal !== 'create_template') return
  void fetchCreateTemplateDetail(id)
})

function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (errorHint.value) return
  const kind = modalKind.value
  /** @type {Record<string, unknown>} */
  let config = {}
  if (kind === 'schedule') {
    config = {
      dayMode: schedule.dayMode,
      weekdays: [...schedule.weekdays],
      times: normalizeScheduleTimes([...schedule.times]),
      timezone: profileTimezoneIana.value,
    }
  } else if (kind === 'if_else') {
    config = normalizeIfElseConfig({
      blockTitle: ifElseCfg.blockTitle,
      authorScope: ifElseCfg.authorScope,
      tagScope: ifElseCfg.tagScope,
      tagValue: ifElseCfg.tagValue,
      machinePredicate: ifElseCfg.machinePredicate,
    })
  } else if (kind === 'manual') {
    config = normalizeManualHomeConfig({
      buttons: [
        {
          label: manualHome.buttonLabel,
          variant: manualHome.buttonVariant,
          iconKey: manualHome.buttonIconKey,
        },
      ],
    })
  } else if (kind === 'notify_bell') {
    config = {
      title: String(notifyBell.title || '').trim(),
      body: String(notifyBell.body || '').trim(),
      href: String(notifyBell.href || '').trim(),
    }
  } else if (kind === 'wait_teamcity') {
    config = normalizeWaitTeamCityConfig({
      blockTitle: waitTcCfg.blockTitle,
      timeoutMinutes: Number(waitTcTimeoutSelect.value),
    })
  } else if (kind === 'create_template') {
    const tid = Number(selectedCreateTemplateId.value)
    if (!Number.isFinite(tid) || tid < 1) return
    const meta = createTplTemplates.value.find((t) => String(t.id) === String(selectedCreateTemplateId.value))
    config = {
      buildTemplateId: tid,
      templateName: meta ? String(meta.name || '').trim() : '',
      paramOverrides: { ...createTplParamOverrides },
    }
  } else if (kind === 'http_request') {
    const to = Math.min(120_000, Math.max(1000, Number(httpReq.timeoutMs) || 30_000))
    const headers = httpReq.headers
      .map((h) => ({ key: String(h.key || '').trim(), value: String(h.value || '') }))
      .filter((h) => h.key)
    config = {
      blockTitle: String(httpReq.blockTitle || '').trim() || 'HTTP-запрос',
      method: String(httpReq.method || 'GET').toUpperCase(),
      url: String(httpReq.url || '').trim(),
      headers,
      body: String(httpReq.body || ''),
      timeoutMs: to,
    }
  } else if (kind === 'vm_power') {
    config = normalizeVmPowerConfig({
      blockTitle: vmPower.blockTitle,
      targetMode: vmPower.targetMode,
      tagValue: vmPower.tagValue,
    })
  }
  emit('confirm', config)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.automation-block-config-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
}
.automation-block-config-scroll::-webkit-scrollbar {
  width: 8px;
}
.automation-block-config-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.55);
  border-radius: 999px;
}
</style>
