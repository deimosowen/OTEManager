import { and, eq, inArray } from 'drizzle-orm'
import { AUDIT_ACTION } from '@app-constants/audit.js'
import { getDb } from '../db/client.js'
import { oteTcCreations } from '../db/schema.js'
import { auditPayloadFromUser, recordAuditEvent } from './audit-log.js'
import { fetchTeamCityBuildJson, parseResultingPropertiesMap } from './teamcity/build-details.js'
import { fetchTeamCityBuildSnapshot } from './teamcity/client.js'
import { resolveTeamCityAuthorizationHeader } from './teamcity/resolve-auth.js'

const ACTIVE_STATUSES = /** @type {const} */ (['queued', 'running'])

/**
 * @param {typeof oteTcCreations.$inferSelect} row
 */
function metadataTagFromRequest(row) {
  if (!row.requestPropertiesJson) return null
  try {
    const j = JSON.parse(row.requestPropertiesJson)
    const t = j && typeof j === 'object' ? j['metadata.tag'] : null
    return t != null && String(t).trim() ? String(t).trim() : null
  } catch {
    return null
  }
}

/**
 * @param {typeof oteTcCreations.$inferSelect} row
 */
function rowToPublic(row) {
  let requestProperties = null
  if (row.requestPropertiesJson) {
    try {
      requestProperties = JSON.parse(row.requestPropertiesJson)
    } catch {
      requestProperties = null
    }
  }
  return {
    id: row.id,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    actorLogin: row.actorLogin,
    actorEmail: row.actorEmail,
    presetId: row.presetId,
    buildTypeId: row.buildTypeId,
    teamcityBuildId: row.teamcityBuildId,
    teamcityWebUrl: row.teamcityWebUrl,
    status: row.status,
    requestProperties,
    metadataTag: row.metadataTag,
    caseoneVersion: row.caseoneVersion,
    deploymentResultJson: row.deploymentResultJson,
    rabbitUrl: row.rabbitUrl,
    saasAppUrl: row.saasAppUrl,
    caseoneUrl: row.caseoneUrl,
    lastError: row.lastError,
  }
}

function activeRowFilter(id) {
  return and(eq(oteTcCreations.id, id), inArray(oteTcCreations.status, ACTIVE_STATUSES))
}

/**
 * Обновить запись по ответу TeamCity (опрос + разбор resulting properties).
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 * @param {{ login?: string, email?: string, id?: string }} user — для аудита при смене статуса
 * @param {typeof oteTcCreations.$inferSelect} row
 * @returns {Promise<ReturnType<typeof rowToPublic>>}
 */
export async function syncOteTcCreationRow(config, user, row) {
  const db = getDb()
  const now = new Date()
  const buildId = row.teamcityBuildId ? String(row.teamcityBuildId).trim() : ''
  if (!buildId) {
    return rowToPublic(row)
  }

  if (row.status === 'succeeded' || row.status === 'failed') {
    return rowToPublic(row)
  }

  const tagHint = row.metadataTag || metadataTagFromRequest(row)

  const authorization = await resolveTeamCityAuthorizationHeader(config, { userKey: row.actorLogin })
  if (!authorization) {
    const [updated] = await db
      .update(oteTcCreations)
      .set({
        updatedAt: now,
        lastError: 'Нет авторизации TeamCity',
        status: 'failed',
      })
      .where(activeRowFilter(row.id))
      .returning()
    if (updated) {
      await recordAuditEvent(
        auditPayloadFromUser(user, {
          actionCode: AUDIT_ACTION.OTE_CREATE_TC_FAILED,
          oteResourceId: `tc-creation:${row.id}`,
          oteTag: tagHint,
          details: {
            creationId: row.id,
            reason: 'no_teamcity_authorization',
            teamcityBuildId: buildId,
            teamcityWebUrl: row.teamcityWebUrl || null,
          },
        }),
      )
    }
    const [r] = await db.select().from(oteTcCreations).where(eq(oteTcCreations.id, row.id)).limit(1)
    return rowToPublic(r || row)
  }

  const snap = await fetchTeamCityBuildSnapshot({ config, buildId, authorization })
  if (!snap || snap.httpStatus === 404) {
    await db.update(oteTcCreations).set({ updatedAt: now, status: 'running' }).where(eq(oteTcCreations.id, row.id))
    const [r] = await db.select().from(oteTcCreations).where(eq(oteTcCreations.id, row.id)).limit(1)
    return rowToPublic(r || row)
  }

  if (!snap.terminal) {
    await db.update(oteTcCreations).set({ updatedAt: now, status: 'running' }).where(eq(oteTcCreations.id, row.id))
    const [r] = await db.select().from(oteTcCreations).where(eq(oteTcCreations.id, row.id)).limit(1)
    return rowToPublic(r || row)
  }

  const ok = String(snap.status || '').toUpperCase() === 'SUCCESS'
  if (!ok) {
    const err = `Сборка завершилась: ${snap.state || ''} / ${snap.status || ''}`.trim()
    const [updated] = await db
      .update(oteTcCreations)
      .set({
        updatedAt: now,
        status: 'failed',
        lastError: err,
      })
      .where(activeRowFilter(row.id))
      .returning()
    if (updated) {
      await recordAuditEvent(
        auditPayloadFromUser(user, {
          actionCode: AUDIT_ACTION.OTE_CREATE_TC_FAILED,
          oteResourceId: `tc-creation:${row.id}`,
          oteTag: tagHint,
          details: {
            creationId: row.id,
            teamcityBuildId: buildId,
            teamcityWebUrl: row.teamcityWebUrl || null,
            state: snap.state,
            status: snap.status,
          },
        }),
      )
    }
    const [r] = await db.select().from(oteTcCreations).where(eq(oteTcCreations.id, row.id)).limit(1)
    return rowToPublic(r || row)
  }

  const details = await fetchTeamCityBuildJson({ config, buildId, authorization })
  if (!details.buildRoot || details.httpStatus !== 200) {
    const err =
      details.httpStatus !== 200
        ? `TeamCity HTTP ${details.httpStatus}: не удалось загрузить сборку для чтения параметров`
        : 'Пустой ответ сборки TeamCity'
    const [updated] = await db
      .update(oteTcCreations)
      .set({
        updatedAt: now,
        status: 'failed',
        lastError: err,
      })
      .where(activeRowFilter(row.id))
      .returning()
    if (updated) {
      await recordAuditEvent(
        auditPayloadFromUser(user, {
          actionCode: AUDIT_ACTION.OTE_CREATE_TC_FAILED,
          oteResourceId: `tc-creation:${row.id}`,
          oteTag: tagHint,
          details: {
            creationId: row.id,
            teamcityBuildId: buildId,
            teamcityWebUrl: row.teamcityWebUrl || null,
            reason: 'resulting_properties_unavailable',
            httpStatus: details.httpStatus,
          },
        }),
      )
    }
    const [r] = await db.select().from(oteTcCreations).where(eq(oteTcCreations.id, row.id)).limit(1)
    return rowToPublic(r || row)
  }

  const map = parseResultingPropertiesMap(details.buildRoot)
  const metadataTag = map['metadata.tag'] || null
  const caseoneVersion = map['caseone.version'] || null
  const deploymentResultJson = map['deployment_result.json'] || null
  const rabbitUrl = map['deployment_result.rabbit_url'] || null
  const saasAppUrl = map['deployment_result.saas_app_url'] || null
  const caseoneUrl = map['deployment_result.caseone_url'] || null

  const [updated] = await db
    .update(oteTcCreations)
    .set({
      updatedAt: now,
      status: 'succeeded',
      metadataTag,
      caseoneVersion,
      deploymentResultJson,
      rabbitUrl,
      saasAppUrl,
      caseoneUrl,
      lastError: null,
    })
    .where(activeRowFilter(row.id))
    .returning()

  if (updated) {
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: AUDIT_ACTION.OTE_CREATE_TC_SUCCEEDED,
        oteResourceId: `tc-creation:${row.id}`,
        oteTag: metadataTag,
        details: {
          creationId: row.id,
          teamcityBuildId: buildId,
          teamcityWebUrl: row.teamcityWebUrl || null,
          caseoneVersion,
          rabbitUrl,
          saasAppUrl,
          caseoneUrl,
        },
      }),
    )
  }

  const [r] = await db.select().from(oteTcCreations).where(eq(oteTcCreations.id, row.id)).limit(1)
  return rowToPublic(r || row)
}

export { rowToPublic }
