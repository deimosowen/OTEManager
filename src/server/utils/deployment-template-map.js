/**
 * @param {typeof import('../db/schema.js').oteDeploymentTemplates.$inferSelect} row
 */
export function mapDeploymentTemplateSummary(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    createdByLogin: row.createdByLogin,
    createdByEmail: row.createdByEmail,
    updatedByLogin: row.updatedByLogin,
    updatedByEmail: row.updatedByEmail,
  }
}

/**
 * @param {typeof import('../db/schema.js').oteDeploymentTemplates.$inferSelect} row
 */
export function mapDeploymentTemplateFull(row) {
  return {
    ...mapDeploymentTemplateSummary(row),
    description: row.description || null,
    yaml: row.yamlBody,
  }
}
