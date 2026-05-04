import { AUDIT_ACTION } from '@app-constants/audit.js'
import { getDb } from '../../../db/client.js'
import { oteBuildTemplates } from '../../../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from '../../../utils/audit-log.js'
import { parseIsPersonalFromBody, rowIsPersonal } from '../../../utils/build-template-access.js'
import { parseBuildTemplateParams } from '../../../utils/build-template-params.js'
import { mapBuildTemplateFull } from '../../../utils/build-template-map.js'
import { assertValidYamlString } from '../../../utils/deployment-template-yaml.js'
import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'
import { fetchTeamCityGroupSettingsByUserKey } from '../../../utils/teamcity/group-settings.js'

function mustString(body, key, maxLen) {
  const v = body && typeof body[key] === 'string' ? body[key] : ''
  const s = String(v || '').trim()
  if (!s) return ''
  return s.slice(0, maxLen)
}

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const body = await readBody(event)

  const name = mustString(body, 'name', 256)
  if (!name) throw createError({ statusCode: 400, message: 'Укажите название шаблона' })

  const teamcityBuildTypeId = mustString(body, 'teamcityBuildTypeId', 256)
  if (!teamcityBuildTypeId) {
    throw createError({ statusCode: 400, message: 'Укажите buildTypeId TeamCity' })
  }
  const db = getDb()
  const g = await fetchTeamCityGroupSettingsByUserKey(db, integrationUserKey(user))
  const tcUi = g?.tcUiBaseUrl || g?.tcRestBaseUrl || ''
  const teamcityBuildConfigUrl =
    mustString(body, 'teamcityBuildConfigUrl', 2048) ||
    (tcUi
      ? `${tcUi.replace(/\/+$/, '')}/buildConfiguration/${encodeURIComponent(teamcityBuildTypeId)}`
      : '')
  if (!teamcityBuildConfigUrl) {
    throw createError({
      statusCode: 503,
      message: 'Не задан URL TeamCity для вашей группы — администратор может настроить его в «Система».',
    })
  }

  const description = body && typeof body.description === 'string' ? body.description.trim().slice(0, 4000) : ''
  let yamlBody = ''
  try {
    yamlBody = assertValidYamlString(body && typeof body.yaml === 'string' ? body.yaml : '')
  } catch (e) {
    throw createError({ statusCode: 400, message: e?.message || String(e) })
  }

  let params = {}
  try {
    params = parseBuildTemplateParams(body?.params)
  } catch (e) {
    throw createError({ statusCode: 400, message: e?.message || String(e) })
  }

  const isPersonal = parseIsPersonalFromBody(body) ? 1 : 0
  const now = new Date()
  const login = integrationUserKey(user)
  const email = String(user.email || '').trim()

  let row = null
  try {
    const ret = await db
      .insert(oteBuildTemplates)
      .values({
        name,
        description: description || null,
        teamcityBuildConfigUrl,
        teamcityBuildTypeId,
        yamlBody,
        paramsJson: JSON.stringify(params),
        isPersonal,
        createdAt: now,
        updatedAt: now,
        createdByLogin: login,
        createdByEmail: email,
        updatedByLogin: login,
        updatedByEmail: email,
      })
      .returning()
    row = ret?.[0] || null
  } catch (e) {
    const msg = e?.message || String(e)
    const cause = e?.cause?.message || (typeof e?.cause === 'string' ? e.cause : '')
    const details = [msg, cause].filter(Boolean).join(' | ')
    throw createError({ statusCode: 500, message: `DB: не удалось сохранить шаблон (${details})` })
  }

  if (!row) throw createError({ statusCode: 500, message: 'Не удалось сохранить шаблон' })

  if (!rowIsPersonal(row.isPersonal)) {
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: AUDIT_ACTION.OTE_BUILD_TEMPLATE_CREATE,
        oteResourceId: `build-template:${row.id}`,
        oteTag: row.name,
        details: { templateId: row.id, name: row.name },
      }),
    )
  }

  return { template: mapBuildTemplateFull(row) }
})

