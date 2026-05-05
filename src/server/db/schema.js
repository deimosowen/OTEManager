import { index, integer, primaryKey, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

/**
 * Служебные ключи приложения (версия схемы, флаги и т.д.).
 * Расширяйте таблицами рядом в этом файле — затем `npm run db:generate`.
 */
export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
})

/**
 * Ожидание завершения операции TeamCity по OTE (старт / стоп / удаление по тегу и т.д.).
 * Одна строка на OTE; TTL в `expires_at`. Общая БД даёт блокировку между рестартами и репликами,
 * если все процессы смотрят в один файл SQLite / LibSQL URL.
 */
export const oteTcOperationPending = sqliteTable('ote_tc_operation_pending', {
  oteResourceId: text('ote_resource_id', { length: 512 }).primaryKey(),
  action: text('action', { length: 32 }).notNull(),
  queuedAt: integer('queued_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  teamcityBuildId: text('teamcity_build_id', { length: 32 }),
  tcAuthUserKey: text('tc_auth_user_key', { length: 256 }).notNull().default(''),
  tcRestBaseUrl: text('tc_rest_base_url', { length: 2048 }).notNull().default(''),
})

/**
 * Журнал действий пользователей.
 * `action_code` — строковый код из `~/constants/audit.js` (без CHECK в SQL для расширяемости).
 * `occurred_at` — UTC в миллисекундах (Unix epoch ms).
 */
export const auditEvents = sqliteTable(
  'audit_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    actionCode: text('action_code', { length: 128 }).notNull(),
    actorLogin: text('actor_login', { length: 256 }).notNull(),
    actorEmail: text('actor_email', { length: 512 }).notNull(),
    /** Идентификатор OTE в приложении: `grp:…`, id ВМ, `seed-…` и т.д. */
    oteResourceId: text('ote_resource_id', { length: 512 }),
    /** Человекочитаемая метка (напр. metadata.tag или имя при создании). */
    oteTag: text('ote_tag', { length: 512 }),
    /** JSON: buildId, ip, user-agent, версии формы и т.п. */
    detailsJson: text('details_json'),
  },
  (t) => ({
    occurredAtIdx: index('audit_events_occurred_at_idx').on(t.occurredAt),
    oteResourceOccurredIdx: index('audit_events_ote_resource_occurred_idx').on(t.oteResourceId, t.occurredAt),
    actionOccurredIdx: index('audit_events_action_occurred_idx').on(t.actionCode, t.occurredAt),
  }),
)

/**
 * Секреты пользовательских интеграций (TeamCity и др.).
 * Составной ключ: стабильный идентификатор пользователя (логин Яндекса / email / sub) + код провайдера.
 */
/**
 * Запросы на создание OTE через TeamCity (очередь сборки + разбор параметров после завершения).
 */
export const oteTcCreations = sqliteTable(
  'ote_tc_creations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
    actorLogin: text('actor_login', { length: 256 }).notNull(),
    actorEmail: text('actor_email', { length: 512 }).notNull(),
    presetId: text('preset_id', { length: 64 }).notNull(),
    buildTypeId: text('build_type_id', { length: 256 }).notNull(),
    teamcityBuildId: text('teamcity_build_id', { length: 32 }),
    teamcityWebUrl: text('teamcity_web_url', { length: 1024 }),
    status: text('status', { length: 32 }).notNull().default('queued'),
    requestPropertiesJson: text('request_properties_json'),
    buildTemplateId: integer('build_template_id'),
    requestTemplateYaml: text('request_template_yaml'),
    requestRenderedYaml: text('request_rendered_yaml'),
    requestParamsJson: text('request_params_json'),
    metadataTag: text('metadata_tag', { length: 512 }),
    caseoneVersion: text('caseone_version', { length: 512 }),
    deploymentResultJson: text('deployment_result_json'),
    rabbitUrl: text('rabbit_url', { length: 1024 }),
    saasAppUrl: text('saas_app_url', { length: 1024 }),
    caseoneUrl: text('caseone_url', { length: 1024 }),
    lastError: text('last_error', { length: 2048 }),
  },
  (t) => ({
    actorCreatedIdx: index('ote_tc_creations_actor_created_idx').on(t.actorLogin, t.createdAt),
    statusIdx: index('ote_tc_creations_status_idx').on(t.status, t.createdAt),
  }),
)

/**
 * Шаблоны сборок создания OTE (TeamCity build + YAML + параметры).
 */
export const oteBuildTemplates = sqliteTable(
  'ote_build_templates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name', { length: 256 }).notNull(),
    description: text('description'),
    teamcityBuildConfigUrl: text('teamcity_build_config_url', { length: 2048 }).notNull(),
    teamcityBuildTypeId: text('teamcity_build_type_id', { length: 256 }).notNull(),
    yamlBody: text('yaml_body').notNull(),
    paramsJson: text('params_json').notNull(),
    isPersonal: integer('is_personal').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    createdByLogin: text('created_by_login', { length: 256 }).notNull(),
    createdByEmail: text('created_by_email', { length: 512 }).notNull(),
    updatedByLogin: text('updated_by_login', { length: 256 }).notNull(),
    updatedByEmail: text('updated_by_email', { length: 512 }).notNull(),
  },
  (t) => ({
    updatedAtIdx: index('ote_build_templates_updated_at_idx').on(t.updatedAt),
  }),
)

/** In-app уведомления пользователя (ключ как в `integrationUserKey`). */
export const userNotifications = sqliteTable(
  'user_notifications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    readAt: integer('read_at', { mode: 'timestamp_ms' }),
    userKey: text('user_key', { length: 256 }).notNull(),
    kind: text('kind', { length: 64 }).notNull(),
    title: text('title', { length: 512 }).notNull(),
    body: text('body', { length: 2048 }),
    href: text('href', { length: 1024 }).notNull(),
    tcCreationId: integer('tc_creation_id').notNull(),
  },
  (t) => ({
    userTcKindUq: unique('user_notifications_user_tc_kind_uq').on(t.userKey, t.tcCreationId, t.kind),
    userCreatedIdx: index('user_notifications_user_created_idx').on(t.userKey, t.createdAt),
  }),
)

/** Персональные настройки UI (ключ совпадает с `integrationUserKey`: логин, иначе email, иначе id). */
export const userSettings = sqliteTable('user_settings', {
  userLogin: text('user_login', { length: 256 }).primaryKey(),
  timezone: text('timezone', { length: 128 }).notNull().default('UTC'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
})

/** Роли приложения (код — стабильный идентификатор для проверок в коде). */
export const appRoles = sqliteTable(
  'app_roles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code', { length: 64 }).notNull(),
    label: text('label', { length: 128 }).notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    codeUq: unique('app_roles_code_uq').on(t.code),
  }),
)

/** Группы каталога пользователей (системная «Общая» + произвольные). */
export const oteAppGroups = sqliteTable(
  'ote_app_groups',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code', { length: 64 }).notNull(),
    name: text('name', { length: 256 }).notNull(),
    isSystem: integer('is_system').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    codeUq: unique('ote_app_groups_code_uq').on(t.code),
  }),
)

/** TeamCity: URL и buildTypeId для операций — настройки по группе. */
export const oteGroupTeamcitySettings = sqliteTable('ote_group_teamcity_settings', {
  groupId: integer('group_id')
    .primaryKey()
    .references(() => oteAppGroups.id, { onDelete: 'cascade' }),
  tcRestBaseUrl: text('tc_rest_base_url', { length: 2048 }).notNull(),
  tcUiBaseUrl: text('tc_ui_base_url', { length: 2048 }).notNull(),
  startBuildTypeId: text('start_build_type_id', { length: 512 }).notNull(),
  stopBuildTypeId: text('stop_build_type_id', { length: 512 }).notNull(),
  deleteBuildTypeId: text('delete_build_type_id', { length: 512 }).notNull(),
  modifyDeleteDateBuildTypeId: text('modify_delete_date_build_type_id', { length: 512 }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  updatedByUserKey: text('updated_by_user_key', { length: 256 }),
})

/** Yandex Cloud: каталог с виртуальными машинами группы (как TeamCity — по группе каталога). */
export const oteGroupYcSettings = sqliteTable('ote_group_yc_settings', {
  groupId: integer('group_id')
    .primaryKey()
    .references(() => oteAppGroups.id, { onDelete: 'cascade' }),
  ycFolderId: text('yc_folder_id', { length: 128 }).notNull().default(''),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  updatedByUserKey: text('updated_by_user_key', { length: 256 }),
})

/** Известные пользователи (OAuth); синхронизация при входе. */
export const oteDirectoryUsers = sqliteTable(
  'ote_directory_users',
  {
    userKey: text('user_key', { length: 256 }).primaryKey(),
    email: text('email', { length: 512 }).notNull(),
    login: text('login', { length: 256 }).notNull().default(''),
    displayName: text('display_name', { length: 512 }).notNull().default(''),
    groupId: integer('group_id')
      .notNull()
      .references(() => oteAppGroups.id, { onDelete: 'restrict' }),
    firstSeenAt: integer('first_seen_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    emailIdx: index('ote_directory_users_email_idx').on(t.email),
    lastSeenIdx: index('ote_directory_users_last_seen_idx').on(t.lastSeenAt),
    groupIdIdx: index('ote_directory_users_group_id_idx').on(t.groupId),
  }),
)

/** Назначенные роли пользователю. */
export const oteUserRoleAssignments = sqliteTable(
  'ote_user_role_assignments',
  {
    userKey: text('user_key', { length: 256 }).notNull(),
    roleId: integer('role_id')
      .notNull()
      .references(() => appRoles.id, { onDelete: 'cascade' }),
    assignedAt: integer('assigned_at', { mode: 'timestamp_ms' }).notNull(),
    assignedByUserKey: text('assigned_by_user_key', { length: 256 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userKey, t.roleId] }),
    roleIdx: index('ote_user_role_assignments_role_idx').on(t.roleId),
  }),
)

export const userIntegrationCredentials = sqliteTable(
  'user_integration_credentials',
  {
    userLogin: text('user_login', { length: 256 }).notNull(),
    provider: text('provider', { length: 64 }).notNull(),
    cipherBlob: text('cipher_blob').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userLogin, t.provider] }),
  }),
)

/** Избранные шаблоны сборки для быстрого запуска (по пользователю). */
export const oteUserBuildTemplateFavorites = sqliteTable(
  'ote_user_build_template_favorites',
  {
    userLogin: text('user_login', { length: 256 }).notNull(),
    buildTemplateId: integer('build_template_id').notNull(),
    addedAt: integer('added_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userLogin, t.buildTemplateId] }),
    userAddedIdx: index('ote_user_btfav_user_added_idx').on(t.userLogin, t.addedAt),
  }),
)

/** Недавно использованные шаблоны (одна строка на пару пользователь + шаблон, last_used_at обновляется). */
export const oteUserBuildTemplateRecent = sqliteTable(
  'ote_user_build_template_recent',
  {
    userLogin: text('user_login', { length: 256 }).notNull(),
    buildTemplateId: integer('build_template_id').notNull(),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userLogin, t.buildTemplateId] }),
    userTimeIdx: index('ote_user_btrec_user_time_idx').on(t.userLogin, t.lastUsedAt),
  }),
)
