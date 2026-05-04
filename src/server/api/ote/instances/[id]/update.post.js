import { createError } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../db/client.js'
import { oteBuildTemplates } from '../../../../db/schema.js'
import { requireOteUser } from '../../../../utils/require-ote-auth.js'
import { assertMetadataTagNotBlockedByOteCreation } from '../../../../utils/ote-tc-creation-guard.js'
import { fetchLatestSucceededOteTcCreationForMetadataTag } from '../../../../utils/ote-tc-creation-latest-succeeded.js'
import { rowToPublic } from '../../../../utils/ote-tc-creation-sync.js'
import { mergeBuildTemplateOverrides } from '../../../../utils/build-template-params.js'
import {
  mergeParamsFromTemplateAndOverrides,
  queueOteTcJobFromBuildTemplate,
} from '../../../../utils/ote-build-template-queue.js'
import { OTE_TC_PRESET_BUILD_TEMPLATE_UPDATE } from '../../../../utils/ote-tc-job-audit.js'
import { isTeamCityAuthAvailable } from '../../../../utils/teamcity/resolve-auth.js'
import { pickMetadataTagFromMembers } from '../../../../utils/teamcity/metadata-tag.js'
import { requireYcFolderIdForUser } from '../../../../utils/yc/group-settings.js'
import { runtimeConfigString } from '../../../../utils/yc/config-helpers.js'
import { createYandexCloudSession } from '../../../../utils/yc/session.js'
import { mapYcInstanceStatusToOte } from '../../../../utils/yc/compute.js'
import { listMemberInstancesForOteId } from '../../../../utils/yc/ote-members.js'
import { OTE_STATUS } from '@app-constants/ote.js'
import { buildTemplateIdVisibleToUser } from '../../../../utils/build-template-access.js'
import { integrationUserKey } from '../../../../utils/integrations/user-credentials.js'

/**
 * Обновить OTE той же сборкой TeamCity, что и при создании: тело `{ caseoneVersion, buildTemplateId? }`.
 * `metadata.tag` берётся с текущей OTE и передаётся в сборку как при создании (обновление существующей метки).
 */
export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Не указан id' })
  }

  const config = useRuntimeConfig(event)
  if (!(await isTeamCityAuthAvailable(config, { user }))) {
    throw createError({
      statusCode: 503,
      message:
        'TeamCity недоступен: добавьте персональный токен в профиле (раздел «Интеграции»).',
    })
  }

  const body = await readBody(event)
  const caseoneVersion = String(body?.caseoneVersion ?? '').trim()
  if (!caseoneVersion) {
    throw createError({ statusCode: 400, message: 'Укажите caseone.version' })
  }

  const db = getDb()
  const folderId = await requireYcFolderIdForUser(db, user)
  const session = createYandexCloudSession(config)
  if (!session) {
    throw createError({ statusCode: 503, message: 'Не настроен ключ сервисного аккаунта YC' })
  }

  const members = await listMemberInstancesForOteId(session, folderId, id, config)
  if (!members.length) {
    throw createError({ statusCode: 404, message: 'ВМ не найдены' })
  }

  for (const m of members) {
    if (mapYcInstanceStatusToOte(m.status) !== OTE_STATUS.RUNNING) {
      throw createError({
        statusCode: 409,
        message: 'Обновление доступно только когда все ВМ OTE запущены. Запустите остановленные машины.',
      })
    }
  }

  const labelKey =
    runtimeConfigString(config.ycInstanceLabelKey, 'NUXT_YC_INSTANCE_LABEL_KEY') || 'metadata-tag'
  const metadataTag = pickMetadataTagFromMembers(members, labelKey)
  if (!metadataTag) {
    throw createError({ statusCode: 400, message: 'Не удалось определить metadata.tag для этой OTE' })
  }

  await assertMetadataTagNotBlockedByOteCreation(db, metadataTag)

  const userKey = integrationUserKey(user)
  const rawTplId = body?.buildTemplateId
  let buildTemplateId =
    rawTplId != null && String(rawTplId).trim() !== '' ? Number(String(rawTplId).trim()) : NaN

  const lastSucc = await fetchLatestSucceededOteTcCreationForMetadataTag(db, metadataTag)
  if (!Number.isFinite(buildTemplateId) || buildTemplateId < 1) {
    buildTemplateId = lastSucc?.buildTemplateId != null ? Number(lastSucc.buildTemplateId) : NaN
  }
  if (!Number.isFinite(buildTemplateId) || buildTemplateId < 1) {
    throw createError({
      statusCode: 400,
      message:
        'В менеджере нет успешной сборки TeamCity для этой метки (metadata.tag), чтобы взять шаблон. Создайте OTE здесь хотя бы раз с этим тегом или передайте в теле запроса buildTemplateId (доступный вам шаблон сборки).',
    })
  }

  const visible = await buildTemplateIdVisibleToUser(db, buildTemplateId, userKey)
  if (!visible) {
    throw createError({ statusCode: 403, message: 'Нет доступа к выбранному шаблону сборки' })
  }

  /** @type {Record<string, string>} */
  let seed = {}
  if (lastSucc?.buildTemplateId === buildTemplateId && lastSucc.requestParamsJson) {
    try {
      const p = JSON.parse(String(lastSucc.requestParamsJson))
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        for (const [k, v] of Object.entries(p)) {
          seed[String(k)] = v == null ? '' : String(v)
        }
      }
    } catch {
      seed = {}
    }
  }

  const [tplRows] = await db.select().from(oteBuildTemplates).where(eq(oteBuildTemplates.id, buildTemplateId)).limit(1)
  if (!tplRows) {
    throw createError({ statusCode: 404, message: 'Шаблон не найден' })
  }

  const baseMerged = mergeParamsFromTemplateAndOverrides(tplRows.paramsJson, seed)
  const merged = mergeBuildTemplateOverrides(baseMerged, {
    'metadata.tag': metadataTag,
    'caseone.version': caseoneVersion,
  })

  const { created } = await queueOteTcJobFromBuildTemplate({
    user,
    config,
    buildTemplateId,
    mergedParams: merged,
    presetId: OTE_TC_PRESET_BUILD_TEMPLATE_UPDATE,
  })

  return { creation: rowToPublic(created), oteResourceId: id }
})
