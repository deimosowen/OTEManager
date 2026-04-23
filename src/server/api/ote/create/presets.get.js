import { OTE_CREATION_PRESETS } from '@app-constants/ote-creation-presets.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

/**
 * Пресеты сборок TeamCity для создания OTE (поля формы + buildTypeId).
 */
export default defineEventHandler(async (event) => {
  requireOteUser(event)
  return { presets: OTE_CREATION_PRESETS }
})
