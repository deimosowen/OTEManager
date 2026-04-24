import { getOteCreationPreset } from '@app-constants/ote-creation-presets.js'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../db/client.js'
import { oteCreateSavedConfigs } from '../../../../db/schema.js'
import { deploymentTemplateIdVisibleToUser } from '../../../../utils/deployment-template-access.js'
import { integrationUserKey } from '../../../../utils/integrations/user-credentials.js'
import { parseDeploymentTemplateId } from '../../../../utils/ote-create-deployment-template-id.js'
import {
  mapOteCreateSavedConfigRow,
  sanitizeSavedOteCreateProperties,
} from '../../../../utils/ote-create-saved-config-properties.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'

function parseId(raw) {
  const n = Number(String(raw || '').trim())
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = parseId(event.context.params?.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Некорректный id' })
  }

  const body = await readBody(event)
  const name = body && typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 256) : ''
  if (!name) {
    throw createError({ statusCode: 400, message: 'Укажите название конфигурации' })
  }
  const basePresetId =
    body && typeof body.basePresetId === 'string' && body.basePresetId.trim() ? body.basePresetId.trim() : ''
  const preset = basePresetId ? getOteCreationPreset(basePresetId) : null
  if (!preset) {
    throw createError({ statusCode: 400, message: 'Неизвестный basePresetId' })
  }

  let deploymentTemplateId = parseDeploymentTemplateId(body?.deploymentTemplateId)
  const presetUsesTemplateCatalog = preset.fields.some((f) => f.type === 'template_select')
  if (!presetUsesTemplateCatalog) {
    deploymentTemplateId = null
  }

  const db = getDb()
  const login = integrationUserKey(user)
  if (deploymentTemplateId) {
    const ok = await deploymentTemplateIdVisibleToUser(db, deploymentTemplateId, login)
    if (!ok) {
      throw createError({ statusCode: 400, message: 'Шаблон деплоя не найден или недоступен' })
    }
  }

  const properties = sanitizeSavedOteCreateProperties(preset, body?.properties, deploymentTemplateId)
  const now = new Date()

  const [row] = await db
    .update(oteCreateSavedConfigs)
    .set({
      name,
      basePresetId: preset.id,
      deploymentTemplateId: deploymentTemplateId || null,
      propertiesJson: JSON.stringify(properties),
      updatedAt: now,
    })
    .where(and(eq(oteCreateSavedConfigs.id, id), eq(oteCreateSavedConfigs.actorLogin, login)))
    .returning()

  if (!row) {
    throw createError({ statusCode: 404, message: 'Конфигурация не найдена' })
  }
  return { config: mapOteCreateSavedConfigRow(row) }
})
