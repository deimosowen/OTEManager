/**
 * @param {typeof import('../db/schema.js').oteBuildTemplates.$inferSelect} row
 */
export function mapBuildTemplateSummary(row) {
  const isPersonal = row.isPersonal === 1 || row.isPersonal === true
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    isPersonal,
    teamcityBuildConfigUrl: row.teamcityBuildConfigUrl,
    teamcityBuildTypeId: row.teamcityBuildTypeId,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    createdByLogin: row.createdByLogin,
    createdByEmail: row.createdByEmail,
    updatedByLogin: row.updatedByLogin,
    updatedByEmail: row.updatedByEmail,
  }
}

/**
 * @param {typeof import('../db/schema.js').oteBuildTemplates.$inferSelect} row
 */
export function mapBuildTemplateFull(row) {
  /** @type {Record<string, string>} */
  let params = {}
  try {
    const raw = row.paramsJson != null ? String(row.paramsJson) : ''
    const parsed = raw ? JSON.parse(raw) : {}
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [k, v] of Object.entries(parsed)) {
        const kk = String(k || '').trim()
        if (!kk) continue
        params[kk] = v == null ? '' : String(v)
      }
    }
  } catch {
    params = {}
  }
  return {
    ...mapBuildTemplateSummary(row),
    yaml: row.yamlBody,
    params,
  }
}

