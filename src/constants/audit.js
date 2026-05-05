/** Префикс `ote_resource_id` для событий групп каталога (ссылка в UI → админка, вкладка «Группы»). */
export const AUDIT_APP_GROUP_RESOURCE_PREFIX = 'app-group:'

/** Размер страницы журнала аудита (фиксировано на сервере и в UI). */
export const AUDIT_LIST_PAGE_SIZE = 20

/** Пауза после ввода в строке поиска перед запросом (мс). */
export const AUDIT_SEARCH_DEBOUNCE_MS = 2500

/**
 * Коды событий аудита (TEXT в БД). Новые действия — новая константа + подпись в AUDIT_ACTION_LABELS.
 * @readonly
 */
export const AUDIT_ACTION = {
  LOGIN: 'login',
  OTE_CREATE: 'ote_create',
  /** Старт создания OTE в TeamCity в журнале пишется после выхода сборки из очереди TC, когда с агента получен metadata.tag. */
  OTE_CREATE_TC_QUEUE: 'ote_create_tc_queue',
  OTE_CREATE_TC_SUCCEEDED: 'ote_create_tc_succeeded',
  OTE_CREATE_TC_FAILED: 'ote_create_tc_failed',
  OTE_UPDATE_TC_QUEUE: 'ote_update_tc_queue',
  OTE_UPDATE_TC_SUCCEEDED: 'ote_update_tc_succeeded',
  OTE_UPDATE_TC_FAILED: 'ote_update_tc_failed',
  OTE_TC_START: 'ote_tc_start',
  OTE_TC_STOP: 'ote_tc_stop',
  OTE_TC_DELETE: 'ote_tc_delete',
  OTE_TC_MODIFY_DELETE_DATE: 'ote_tc_modify_delete_date',
  OTE_QUEUE_DELETE: 'ote_queue_delete',
  OTE_POWER_START: 'ote_power_start',
  OTE_POWER_STOP: 'ote_power_stop',
  OTE_DEPLOY_TEMPLATE_CREATE: 'ote_deploy_template_create',
  OTE_DEPLOY_TEMPLATE_UPDATE: 'ote_deploy_template_update',
  OTE_BUILD_TEMPLATE_CREATE: 'ote_build_template_create',
  OTE_BUILD_TEMPLATE_UPDATE: 'ote_build_template_update',
  OTE_BUILD_TEMPLATE_DELETE: 'ote_build_template_delete',
  USER_ROLES_UPDATE: 'user_roles_update',
  USER_GROUP_UPDATE: 'user_group_update',
  APP_GROUP_CREATE: 'app_group_create',
  APP_GROUP_RENAME: 'app_group_rename',
  APP_GROUP_DELETE: 'app_group_delete',
}

/** @type {Record<string, string>} */
export const AUDIT_ACTION_LABELS = {
  [AUDIT_ACTION.LOGIN]: 'Вход в систему',
  [AUDIT_ACTION.OTE_CREATE]: 'Создание OTE',
  [AUDIT_ACTION.OTE_CREATE_TC_QUEUE]: 'Создание OTE: постановка в TeamCity',
  [AUDIT_ACTION.OTE_CREATE_TC_SUCCEEDED]: 'Создание OTE: сборка успешна',
  [AUDIT_ACTION.OTE_CREATE_TC_FAILED]: 'Создание OTE: ошибка TeamCity',
  [AUDIT_ACTION.OTE_UPDATE_TC_QUEUE]: 'Обновление OTE: постановка в TeamCity',
  [AUDIT_ACTION.OTE_UPDATE_TC_SUCCEEDED]: 'Обновление OTE: сборка успешна',
  [AUDIT_ACTION.OTE_UPDATE_TC_FAILED]: 'Обновление OTE: ошибка TeamCity',
  [AUDIT_ACTION.OTE_TC_START]: 'Запуск (TeamCity)',
  [AUDIT_ACTION.OTE_TC_STOP]: 'Остановка (TeamCity)',
  [AUDIT_ACTION.OTE_TC_DELETE]: 'Удаление (TeamCity)',
  [AUDIT_ACTION.OTE_TC_MODIFY_DELETE_DATE]: 'Изменение даты удаления (TeamCity)',
  [AUDIT_ACTION.OTE_QUEUE_DELETE]: 'Удаление (очередь)',
  [AUDIT_ACTION.OTE_POWER_START]: 'Запуск ВМ (очередь)',
  [AUDIT_ACTION.OTE_POWER_STOP]: 'Остановка ВМ (очередь)',
  [AUDIT_ACTION.OTE_DEPLOY_TEMPLATE_CREATE]: 'Шаблон деплоя: создание',
  [AUDIT_ACTION.OTE_DEPLOY_TEMPLATE_UPDATE]: 'Шаблон деплоя: изменение',
  [AUDIT_ACTION.OTE_BUILD_TEMPLATE_CREATE]: 'Шаблон сборки: создание',
  [AUDIT_ACTION.OTE_BUILD_TEMPLATE_UPDATE]: 'Шаблон сборки: изменение',
  [AUDIT_ACTION.OTE_BUILD_TEMPLATE_DELETE]: 'Шаблон сборки: удаление',
  [AUDIT_ACTION.USER_ROLES_UPDATE]: 'Пользователи: изменение ролей',
  [AUDIT_ACTION.USER_GROUP_UPDATE]: 'Пользователи: смена группы',
  [AUDIT_ACTION.APP_GROUP_CREATE]: 'Группы: создание',
  [AUDIT_ACTION.APP_GROUP_RENAME]: 'Группы: переименование',
  [AUDIT_ACTION.APP_GROUP_DELETE]: 'Группы: удаление',
}

/**
 * @param {string} code
 */
export function auditActionLabel(code) {
  return AUDIT_ACTION_LABELS[code] || code
}

/** Опции для фильтра «тип действия» (значение пустой строки = все). */
export const AUDIT_ACTION_FILTER_OPTIONS = [
  { value: '', label: 'Все действия' },
  ...Object.values(AUDIT_ACTION).map((value) => ({
    value,
    label: AUDIT_ACTION_LABELS[value] || value,
  })),
]
