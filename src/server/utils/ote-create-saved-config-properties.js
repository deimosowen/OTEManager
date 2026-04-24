const MAX_PROP_LEN = 2_000_000

/**
 * Оставить в объекте только ключи из полей пресета; при выборе шаблона из каталога убрать сырой YAML из JSON.
 * @param {{ id: string, fields: { name: string, type?: string }[] }} preset
 * @param {unknown} rawProps
 * @param {number | null} deploymentTemplateId
 * @returns {Record<string, string>}
 */
export function sanitizeSavedOteCreateProperties(preset, rawProps, deploymentTemplateId) {
  const presetUsesTemplateCatalog = preset.fields.some((f) => f.type === 'template_select')
  const input = rawProps && typeof rawProps === 'object' && !Array.isArray(rawProps) ? { ...rawProps } : {}
  if (deploymentTemplateId && presetUsesTemplateCatalog) {
    delete input.default_deploymet_config_template
  }
  /** @type {Record<string, string>} */
  const out = {}
  const names = new Set(preset.fields.map((f) => f.name))
  for (const [k, v] of Object.entries(input)) {
    if (!names.has(k)) continue
    const s = v == null ? '' : String(v)
    out[k] = s.length > MAX_PROP_LEN ? s.slice(0, MAX_PROP_LEN) : s
  }
  return out
}

/** @param {Record<string, unknown>} row */
export function mapOteCreateSavedConfigRow(row) {
  /** @type {Record<string, string>} */
  let properties = {}
  try {
    const raw = row.propertiesJson != null ? String(row.propertiesJson) : ''
    const parsed = raw ? JSON.parse(raw) : {}
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [k, v] of Object.entries(parsed)) {
        properties[k] = v == null ? '' : String(v)
      }
    }
  } catch {
    properties = {}
  }
  return {
    id: row.id,
    name: row.name,
    basePresetId: row.basePresetId,
    deploymentTemplateId: row.deploymentTemplateId != null ? row.deploymentTemplateId : null,
    properties,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : Number(row.updatedAt),
  }
}
