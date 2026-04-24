import { getOteCreationPreset } from '@app-constants/ote-creation-presets.js'
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

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
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
  const email = String(user.email || '').trim()

  const [row] = await db
    .insert(oteCreateSavedConfigs)
    .values({
      createdAt: now,
      updatedAt: now,
      actorLogin: login,
      actorEmail: email,
      name,
      basePresetId: preset.id,
      deploymentTemplateId: deploymentTemplateId || null,
      propertiesJson: JSON.stringify(properties),
    })
    .returning()

  if (!row) {
    throw createError({ statusCode: 500, message: 'Не удалось сохранить конфигурацию' })
  }
  return { config: mapOteCreateSavedConfigRow(row) }
})
