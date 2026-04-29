import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
