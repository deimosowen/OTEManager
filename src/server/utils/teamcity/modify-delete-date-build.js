import { createError } from 'h3'
import { AUDIT_ACTION } from '@app-constants/audit.js'
import { daysLifeFromTodayUtc } from './delete-date-days.js'
import { auditPayloadFromUser, recordAuditEvent } from '../audit-log.js'
import { assertMetadataTagNotBlockedByOteCreation } from '../ote-tc-creation-guard.js'
import {
  clearTcPending,
  peekTcPending,
  reserveTcPendingSlot,
  updateTcPendingBuildId,
} from '../ote-tc-pending.js'
import { integrationUserKey } from '../integrations/user-credentials.js'
import { queueTeamCityBuild } from './client.js'
import { fetchTeamCityGroupSettingsByUserKey } from './group-settings.js'
import { isTeamCityAuthAvailable, resolveTeamCityAuthorizationHeader } from './resolve-auth.js'
import { pickMetadataTagFromMembers } from './metadata-tag.js'
import { listMemberInstancesForOteId } from '../yc/ote-members.js'

/**
 * Постановка в TeamCity сборки смены даты автоудаления по тегу OTE (общая логика для API и защиты).
 *
 * @param {{
 *   db: import('drizzle-orm').LibSQLDatabase<typeof import('../../db/schema.js')>,
 *   config: import('@nuxt/schema').NitroRuntimeConfig,
 *   user: { login?: string, email?: string, name?: string },
 *   folderId: string,
 *   session: unknown,
 *   labelKey: string,
 *   oteResourceId: string,
 *   deleteDateYmd: string,
 *   auditActionCode?: string,
 *   auditExtraDetails?: Record<string, unknown>,
 * }} p
 * @returns {Promise<{ ok: true, metadataTag: string, buildTypeId: string, deleteDateYmd: string, daysLife: number, teamCity: Record<string, unknown> }>}
 */
export async function runTeamCityModifyDeleteDateBuild(p) {
  const {
    db,
    config,
    user,
    folderId,
    session,
    labelKey,
    oteResourceId,
    deleteDateYmd,
    auditActionCode = AUDIT_ACTION.OTE_TC_MODIFY_DELETE_DATE,
    auditExtraDetails,
  } = p

  if (!(await isTeamCityAuthAvailable(config, { user }))) {
    throw createError({
      statusCode: 503,
      message: 'TeamCity недоступен: добавьте персональный токен в профиле (раздел «Интеграции»).',
    })
  }

  const userKey = integrationUserKey(user)
  const g = await fetchTeamCityGroupSettingsByUserKey(db, userKey)
  if (!g?.tcRestBaseUrl) {
    throw createError({
      statusCode: 503,
      message: 'Для вашей группы не задан URL REST TeamCity. Администратор может настроить это в разделе «Система».',
    })
  }
  const tcBase = g.tcRestBaseUrl
  const buildTypeId = g.modifyDeleteDateBuildTypeId
  if (!buildTypeId) {
    throw createError({ statusCode: 503, message: 'Для вашей группы не задан buildTypeId для изменения даты удаления в настройках.' })
  }

  const members = await listMemberInstancesForOteId(session, folderId, oteResourceId, config)
  if (!members.length) {
    throw createError({ statusCode: 404, message: 'ВМ не найдены' })
  }

  const existing = await peekTcPending(oteResourceId)
  if (existing) {
    throw createError({
      statusCode: 409,
      message:
        'Для этой OTE уже запущена операция TeamCity (запуск, остановка, удаление или изменение даты удаления). Дождитесь завершения сборки или истечёт время ожидания.',
      data: { current: existing },
    })
  }

  const metadataTag = pickMetadataTagFromMembers(members, labelKey)
  if (!metadataTag) {
    throw createError({
      statusCode: 400,
      message: `Не удалось определить metadata.tag (метка «${labelKey}» на ВМ)`,
    })
  }

  await assertMetadataTagNotBlockedByOteCreation(db, metadataTag)

  const ymd = String(deleteDateYmd ?? '').trim()
  const daysLife = daysLifeFromTodayUtc(ymd)
  if (!Number.isFinite(daysLife) || daysLife < 1) {
    throw createError({
      statusCode: 400,
      message: 'Дата автоудаления должна быть позже сегодняшнего дня (проверьте формат YYYY-MM-DD)',
    })
  }

  try {
    const authorization = await resolveTeamCityAuthorizationHeader(config, { user })
    const properties = { 'metadata.tag': metadataTag, days_life: String(daysLife) }
    const tcAuthUserKey = integrationUserKey(user)
    const reserved = await reserveTcPendingSlot(oteResourceId, {
      action: 'modify_delete_date',
      tcAuthUserKey,
      tcRestBaseUrl: tcBase,
    })
    if (!reserved) {
      const cur = await peekTcPending(oteResourceId)
      throw createError({
        statusCode: 409,
        message:
          'Для этой OTE уже запущена операция TeamCity (запуск, остановка, удаление или изменение даты удаления). Дождитесь завершения сборки или истечёт время ожидания.',
        data: { current: cur },
      })
    }
    let tc
    try {
      tc = await queueTeamCityBuild({
        config,
        baseUrl: tcBase,
        buildTypeId,
        properties,
        authorization,
      })
    } catch (queueErr) {
      await clearTcPending(oteResourceId)
      throw queueErr
    }
    await updateTcPendingBuildId(oteResourceId, { buildId: tc.buildId })
    const details = {
      teamCityBuildId: tc.buildId || null,
      buildTypeId,
      deleteDate: ymd,
      daysLife,
      ...(auditExtraDetails && typeof auditExtraDetails === 'object' ? auditExtraDetails : {}),
    }
    await recordAuditEvent(
      auditPayloadFromUser(user, {
        actionCode: auditActionCode,
        oteResourceId,
        oteTag: metadataTag,
        details,
      }),
    )
    return {
      ok: /** @type {const} */ (true),
      metadataTag,
      buildTypeId,
      deleteDateYmd: ymd,
      daysLife,
      teamCity: tc,
    }
  } catch (err) {
    const code = typeof err?.statusCode === 'number' ? err.statusCode : undefined
    if (code === 409) throw err
    const msg = err?.message || String(err)
    throw createError({ statusCode: 502, message: msg })
  }
}
