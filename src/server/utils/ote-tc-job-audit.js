import { AUDIT_ACTION } from '@app-constants/audit.js'

export const OTE_TC_PRESET_BUILD_TEMPLATE = 'build-template'
export const OTE_TC_PRESET_BUILD_TEMPLATE_UPDATE = 'build-template-update'

/**
 * @param {string | null | undefined} presetId
 */
export function isOteTcUpdatePreset(presetId) {
  return String(presetId || '') === OTE_TC_PRESET_BUILD_TEMPLATE_UPDATE
}

/**
 * @param {string | null | undefined} presetId
 */
export function oteTcJobAuditActions(presetId) {
  if (isOteTcUpdatePreset(presetId)) {
    return {
      queue: AUDIT_ACTION.OTE_UPDATE_TC_QUEUE,
      succeeded: AUDIT_ACTION.OTE_UPDATE_TC_SUCCEEDED,
      failed: AUDIT_ACTION.OTE_UPDATE_TC_FAILED,
    }
  }
  return {
    queue: AUDIT_ACTION.OTE_CREATE_TC_QUEUE,
    succeeded: AUDIT_ACTION.OTE_CREATE_TC_SUCCEEDED,
    failed: AUDIT_ACTION.OTE_CREATE_TC_FAILED,
  }
}
