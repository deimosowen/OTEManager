/** Кнопка ручного запуска на главной (триггер «Ручной запуск»). Одна кнопка на сценарий. */

export const MANUAL_HOME_VARIANT_OPTIONS = [
  { value: 'primary', label: 'Акцент' },
  { value: 'secondary', label: 'Светлая' },
  { value: 'ghost', label: 'Прозрачная' },
  { value: 'danger', label: 'Опасное' },
  { value: 'warn', label: 'Внимание' },
]

export const MANUAL_HOME_ICON_OPTIONS = [
  { value: '', label: 'Без иконки' },
  { value: 'Play', label: 'Старт' },
  { value: 'Zap', label: 'Молния' },
  { value: 'Rocket', label: 'Ракета' },
  { value: 'Power', label: 'Питание' },
  { value: 'PowerOff', label: 'Стоп' },
  { value: 'Plus', label: 'Плюс' },
  { value: 'Bell', label: 'Колокол' },
  { value: 'Sparkles', label: 'Блеск' },
  { value: 'Layers', label: 'Слои' },
]

const ALLOWED_VARIANTS = new Set(MANUAL_HOME_VARIANT_OPTIONS.map((o) => o.value))
const ALLOWED_ICONS = new Set(MANUAL_HOME_ICON_OPTIONS.map((o) => o.value))

export function defaultManualHomeFormState() {
  return {
    buttonLabel: 'Запуск',
    buttonVariant: 'secondary',
    buttonIconKey: '',
  }
}

export function cloneManualHomeFormState() {
  return { ...defaultManualHomeFormState() }
}

/**
 * @param {unknown} raw
 * @returns {{ buttons: { label: string, variant: string, iconKey: string }[] }}
 */
export function normalizeManualHomeConfig(raw) {
  let buttonsIn = Array.isArray(raw?.buttons) ? raw.buttons : []
  if (!buttonsIn.length && raw && typeof raw === 'object' && 'buttonLabel' in raw) {
    buttonsIn = [
      {
        label: raw.buttonLabel,
        variant: raw.buttonVariant,
        iconKey: raw.buttonIconKey,
      },
    ]
  }
  const buttons = buttonsIn
    .map((b) => ({
      label: String(b?.label ?? '').trim(),
      variant: ALLOWED_VARIANTS.has(b?.variant) ? b.variant : 'secondary',
      iconKey: ALLOWED_ICONS.has(b?.iconKey) ? b.iconKey : '',
    }))
    .filter((b) => b.label.length > 0)
    .slice(0, 1)
  return { buttons }
}

/** Демо для главной до появления API сохранённых сценариев */
export function demoHomeManualPanelConfig() {
  return normalizeManualHomeConfig({
    buttons: [{ label: 'Демо: проверка', variant: 'secondary', iconKey: 'Layers' }],
  })
}
