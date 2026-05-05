import { createError } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { oteBuildTemplates } from '../../../db/schema.js'
import { mergeParamsFromTemplateAndOverrides, queueOteTcJobFromBuildTemplate } from '../../../utils/ote-build-template-queue.js'
import { OTE_TC_PRESET_BUILD_TEMPLATE } from '../../../utils/ote-tc-job-audit.js'
import { rowToPublic } from '../../../utils/ote-tc-creation-sync.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'
import { isTeamCityAuthAvailable } from '../../../utils/teamcity/resolve-auth.js'

/**
 * Поставить сборку создания OTE в TeamCity и сохранить запись в `ote_tc_creations`.
 * Тело: `{ buildTemplateId, overrides?, renderedYaml? }`.
 * Если задан непустой `renderedYaml` (валидный YAML), он уходит в TeamCity как `default_deploymet_config_template`
 * и сохраняется в `ote_tc_creations.request_rendered_yaml` вместо подстановки из шаблона.
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const config = useRuntimeConfig(event)
  if (!(await isTeamCityAuthAvailable(config, { user }))) {
    throw createError({
      statusCode: 503,
      message:
        'TeamCity недоступен: добавьте персональный токен в профиле (раздел «Интеграции»).',
    })
  }

  const body = await readBody(event)
  const rawId = body?.buildTemplateId
  const buildTemplateId = Number(String(rawId ?? '').trim())
  if (!Number.isFinite(buildTemplateId) || buildTemplateId < 1) {
    throw createError({ statusCode: 400, message: 'Некорректный buildTemplateId' })
  }

  const db = getDb()
  const rows = await db.select().from(oteBuildTemplates).where(eq(oteBuildTemplates.id, buildTemplateId)).limit(1)
  const tpl = rows[0]
  if (!tpl) {
    throw createError({ statusCode: 404, message: 'Шаблон не найден' })
  }

  const merged = mergeParamsFromTemplateAndOverrides(tpl.paramsJson, body?.overrides)

  const renderedYamlOverride =
    body && typeof body.renderedYaml === 'string' && body.renderedYaml.trim() ? body.renderedYaml : null

  const { created } = await queueOteTcJobFromBuildTemplate({
    user,
    config,
    buildTemplateId,
    mergedParams: merged,
    presetId: OTE_TC_PRESET_BUILD_TEMPLATE,
    renderedYamlOverride,
  })

  return { creation: rowToPublic(created) }
})
