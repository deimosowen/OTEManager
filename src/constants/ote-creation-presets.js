/**
 * Пресеты создания OTE через TeamCity (build configuration id = id сборки в REST).
 * Имена параметров — как в TeamCity (в т.ч. опечатка default_deploymet_config_template из конфигурации).
 */

export const OTE_CREATION_TC_ORIGIN = 'https://ci.pravo.tech'

/**
 * Фильтр каталога шаблонов по ОС для выбранного пресета создания OTE.
 * @param {string} presetId
 * @returns {'windows'|'linux'}
 */
export function presetIdToTemplateOsFilter(presetId) {
  const id = String(presetId || '').trim()
  if (id === 'win-single' || id === 'win-saas') return 'windows'
  return 'linux'
}

/**
 * Поле формы создания OTE.
 * `defaultValue` — начальное значение и fallback при смене пресета, если пользователь не вводил своё.
 * `advanced: true` — поле в сворачиваемом блоке «редко меняемые» (см. страницу создания OTE).
 * @typedef {{
 *   name: string,
 *   label: string,
 *   type?: 'text'|'select'|'template_select',
 *   required?: boolean,
 *   placeholder?: string,
 *   hint?: string,
 *   options?: { value: string, label: string }[],
 *   defaultValue?: string,
 *   advanced?: boolean,
 * }} OteCreationField
 */

/** Общие пути и RabbitMQ: есть у всех конфигураций деплоя; по умолчанию свёрнуты в форме. */
const ADVANCED_APPS_AND_BACKUPS = /** @type {OteCreationField[]} */ ([
  {
    name: 'appsetting_path',
    label: 'Файл appsettings',
    type: 'text',
    required: true,
    advanced: true,
    defaultValue: 'demo_data_win/appsettings_ote_no_q.json',
    hint: 'TeamCity: appsetting_path',
  },
  {
    name: 'backup_path_main',
    label: 'Бэкап основной БД',
    type: 'text',
    required: true,
    advanced: true,
    defaultValue: 'demo_data_win/CasePro_en_79.bak',
    hint: 'TeamCity: backup_path_main',
  },
  {
    name: 'backup_path_sys',
    label: 'Бэкап системной БД',
    type: 'text',
    required: true,
    advanced: true,
    defaultValue: 'demo_data_win/CasePro_en_79_sys.bak',
    hint: 'TeamCity: backup_path_sys',
  },
])

const ADVANCED_RABBITMQ = /** @type {OteCreationField} */ ({
  name: 'rabbitmq.version',
  label: 'Версия RabbitMQ',
  type: 'select',
  required: true,
  advanced: true,
  defaultValue: '4.2.3',
  hint: 'TeamCity: rabbitmq.version',
  options: [
    { value: '3.12.7', label: '3.12.7' },
    { value: '4.0.8', label: '4.0.8' },
    { value: '4.1.5', label: '4.1.5' },
    { value: '4.2.2', label: '4.2.2' },
    { value: '4.2.3', label: '4.2.3' },
  ],
})

/** MSSQL (год) — для Linux / Docker-сборок. */
const ADVANCED_DATABASE_MSSQL_YEAR = /** @type {OteCreationField} */ ({
  name: 'database.version',
  label: 'Версия MSSQL',
  type: 'select',
  required: true,
  advanced: true,
  defaultValue: '2022',
  hint: 'TeamCity: database.version',
  options: [
    { value: '2014', label: '2014' },
    { value: '2016', label: '2016' },
    { value: '2017', label: '2017' },
    { value: '2019', label: '2019' },
    { value: '2022', label: '2022' },
  ],
})

/** Версия БД для нативных Windows-сборок (значения как в TeamCity). */
const ADVANCED_DATABASE_WINDOWS = /** @type {OteCreationField} */ ({
  name: 'database.version',
  label: 'Версия БД (SQL Server)',
  type: 'select',
  required: true,
  advanced: true,
  defaultValue: '2022',
  hint: 'TeamCity: database.version',
  options: [
    { value: '2019', label: 'SQL Server 2019' },
    { value: '2022', label: 'SQL Server 2022' },
    { value: '2022-latest', label: 'SQL Server 2022 (latest)' },
  ],
})

const ADVANCED_COMMON_LINUX_LIKE = /** @type {OteCreationField[]} */ ([
  ...ADVANCED_APPS_AND_BACKUPS,
  ADVANCED_DATABASE_MSSQL_YEAR,
  ADVANCED_RABBITMQ,
])

const ADVANCED_COMMON_WINDOWS = /** @type {OteCreationField[]} */ ([
  ...ADVANCED_APPS_AND_BACKUPS,
  ADVANCED_DATABASE_WINDOWS,
  ADVANCED_RABBITMQ,
])

/** Первое поле во всех пресетах: единая подпись и подсказка. */
const FIELD_METADATA_TAG = /** @type {OteCreationField} */ ({
  name: 'metadata.tag',
  label: 'Имя будущей OTE',
  type: 'text',
  required: true,
  placeholder: 'например my-ote-01',
  hint: 'Параметр TeamCity: metadata.tag — метка окружения / имени OTE.',
})

/** Для Astra Linux — значение по умолчанию для metadata.tag. */
const FIELD_METADATA_TAG_ASTRA = /** @type {OteCreationField} */ ({
  ...FIELD_METADATA_TAG,
  defaultValue: 'astra-libre',
  placeholder: 'astra-libre',
})

const BASE_FIELDS = /** @type {OteCreationField[]} */ ([
  FIELD_METADATA_TAG,
  {
    name: 'caseone.version',
    label: 'Версия CaseOne',
    type: 'text',
    required: true,
    placeholder: 'latest, Master-env, Release-2.31…',
    hint: 'TeamCity: caseone.version',
  },
  {
    name: 'default_deploymet_config_template',
    label: 'Шаблон OTE',
    type: 'template_select',
    required: true,
    hint: 'В TeamCity в параметр default_deploymet_config_template передаётся текст YAML (из каталога или вручную). Личные шаблоны в списке помечены; их видите только вы.',
  },
  {
    name: 'folder_name',
    label: 'Папка / продукт',
    type: 'text',
    required: true,
    advanced: true,
    defaultValue: 'caseone-dev',
    placeholder: 'caseone-dev',
    hint: 'TeamCity: folder_name — разделение окружений по продукту',
  },
])

/** Ветка CaseOne — для универсального деплоя Astra; редко меняется, в форме под спойлером. */
const ADVANCED_CASEONE_BRANCH = /** @type {OteCreationField} */ ({
  name: 'caseone.branch',
  label: 'Ветка CaseOne',
  type: 'text',
  required: true,
  advanced: true,
  defaultValue: 'master',
  placeholder: 'master',
  hint: 'TeamCity: caseone.branch',
})

/** Пресет CasePro_UniversalDeploy_DeployOrUpdate (Astra Linux). */
const ASTRA_LINUX_UNIVERSAL_FIELDS = /** @type {OteCreationField[]} */ ([
  FIELD_METADATA_TAG_ASTRA,
  {
    name: 'caseone.version',
    label: 'Версия CaseOne',
    type: 'text',
    required: true,
    defaultValue: 'latest',
    placeholder: 'latest',
    hint: 'TeamCity: caseone.version',
  },
  {
    name: 'default_deploymet_config_template',
    label: 'Шаблон OTE',
    type: 'template_select',
    required: true,
    hint: 'В TeamCity в параметр default_deploymet_config_template передаётся текст YAML (из каталога или вручную). Личные шаблоны в списке помечены; их видите только вы.',
  },
  {
    name: 'OS',
    label: 'Операционная система',
    type: 'select',
    required: true,
    defaultValue: 'astralinux-alse-orel-1-8',
    hint: 'TeamCity: OS',
    options: [
      { value: 'astralinux-alse-orel-1-7', label: 'Astra Linux 1.7 Орёл' },
      { value: 'astralinux-alse-voronezh-1-7', label: 'Astra Linux 1.7 Воронеж' },
      { value: 'astralinux-alse-orel-1-8', label: 'Astra Linux 1.8 Орёл' },
      { value: 'astralinux-alse-voronezh-1-8', label: 'Astra Linux 1.8 Воронеж' },
    ],
  },
  {
    name: 'RID',
    label: 'RID (платформа .NET)',
    type: 'select',
    required: true,
    defaultValue: 'linux-x64',
    hint: 'TeamCity: RID',
    options: [
      { value: 'linux-x64', label: 'linux-x64' },
      { value: 'win-x64', label: 'win-x64' },
    ],
  },
  ADVANCED_CASEONE_BRANCH,
  {
    name: 'folder_name',
    label: 'Папка / продукт',
    type: 'text',
    required: true,
    advanced: true,
    defaultValue: 'caseone-dev',
    placeholder: 'caseone-dev',
    hint: 'TeamCity: folder_name — разделение окружений по продукту',
  },
  ...ADVANCED_APPS_AND_BACKUPS,
  ADVANCED_DATABASE_MSSQL_YEAR,
  ADVANCED_RABBITMQ,
])

/** @type {{ id: string, label: string, subtitle: string, buildTypeId: string, buildConfigUrl: string, fields: OteCreationField[] }[]} */
export const OTE_CREATION_PRESETS = [
  {
    id: 'astra-linux',
    label: 'Astra Linux',
    subtitle: 'Универсальный деплой',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdate',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdate`,
    fields: [...ASTRA_LINUX_UNIVERSAL_FIELDS],
  },
  {
    id: 'win-single',
    label: 'Windows single',
    subtitle: 'Нативный Windows, одиночный',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateNativeWindows',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateNativeWindows`,
    fields: [...BASE_FIELDS, ...ADVANCED_COMMON_WINDOWS],
  },
  {
    id: 'win-saas',
    label: 'Windows SaaS',
    subtitle: 'Нативный Windows, SaaS',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateSaasNativeWindows',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateSaasNativeWindows`,
    fields: [...BASE_FIELDS, ...ADVANCED_COMMON_WINDOWS],
  },
  {
    id: 'linux-single',
    label: 'Linux single',
    subtitle: 'Docker, одиночный',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateSingleNodeDocker',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateSingleNodeDocker`,
    fields: [...BASE_FIELDS, ...ADVANCED_COMMON_LINUX_LIKE],
  },
  {
    id: 'linux-saas',
    label: 'Linux SaaS',
    subtitle: 'Docker, SaaS',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateSaasSingleNodeDocker',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateSaasSingleNodeDocker`,
    fields: [...BASE_FIELDS, ...ADVANCED_COMMON_LINUX_LIKE],
  },
  {
    id: 'linux-tantor-single',
    label: 'Linux Tantor single',
    subtitle: 'Docker + Tantor, одиночный',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateSingleNodeDockerTantordb',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateSingleNodeDockerTantordb`,
    fields: [...BASE_FIELDS, ...ADVANCED_COMMON_LINUX_LIKE],
  },
  {
    id: 'linux-tantor-saas',
    label: 'Linux Tantor SaaS',
    subtitle: 'Docker + Tantor, SaaS',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateSaasSingleNodeDockerTantordb',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateSaasSingleNodeDockerTantordb`,
    fields: [...BASE_FIELDS, ...ADVANCED_COMMON_LINUX_LIKE],
  },
]

/**
 * @param {string} presetId
 */
export function getOteCreationPreset(presetId) {
  return OTE_CREATION_PRESETS.find((p) => p.id === presetId) || null
}
