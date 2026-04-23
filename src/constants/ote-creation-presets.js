/**
 * Пресеты создания OTE через TeamCity (build configuration id = id сборки в REST).
 * Имена параметров — как в TeamCity (в т.ч. опечатка default_deploymet_config_template из конфигурации).
 */

export const OTE_CREATION_TC_ORIGIN = 'https://ci.pravo.tech'

/** @typedef {{ name: string, label: string, type?: 'text'|'select'|'template_select', required?: boolean, placeholder?: string, hint?: string, options?: { value: string, label: string }[] }} OteCreationField */

const BASE_FIELDS = /** @type {OteCreationField[]} */ ([
  {
    name: 'metadata.tag',
    label: 'Имя будущей OTE',
    type: 'text',
    required: true,
    placeholder: 'например my-ote-01',
    hint: 'Параметр metadata.tag',
  },
  {
    name: 'caseone.version',
    label: 'Сборка CaseOne',
    type: 'text',
    required: true,
    placeholder: 'Master-env, Release-2.31, …',
  },
  {
    name: 'default_deploymet_config_template',
    label: 'Шаблон OTE',
    type: 'template_select',
    required: true,
    hint: 'В TeamCity в параметр default_deploymet_config_template передаётся текст YAML (из каталога или вручную).',
  },
  {
    name: 'folder_name',
    label: 'Папка / продукт',
    type: 'text',
    required: true,
    placeholder: 'CaseOne, УД, …',
    hint: 'Разделение окружений по продукту',
  },
])

const WIN_DB_FIELD = /** @type {OteCreationField} */ ({
  name: 'database.version',
  label: 'Версия БД',
  type: 'select',
  required: true,
  options: [
    { value: '2019', label: 'SQL Server 2019' },
    { value: '2022', label: 'SQL Server 2022' },
    { value: '2022-latest', label: 'SQL Server 2022 (latest)' },
  ],
})

/** @type {{ id: string, label: string, subtitle: string, buildTypeId: string, buildConfigUrl: string, fields: OteCreationField[] }[]} */
export const OTE_CREATION_PRESETS = [
  {
    id: 'astra-linux',
    label: 'Astra Linux',
    subtitle: 'Универсальный деплой',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdate',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdate`,
    fields: [...BASE_FIELDS],
  },
  {
    id: 'win-single',
    label: 'Windows single',
    subtitle: 'Нативный Windows, одиночный',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateNativeWindows',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateNativeWindows`,
    fields: [...BASE_FIELDS, WIN_DB_FIELD],
  },
  {
    id: 'win-saas',
    label: 'Windows SaaS',
    subtitle: 'Нативный Windows, SaaS',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateSaasNativeWindows',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateSaasNativeWindows`,
    fields: [...BASE_FIELDS, WIN_DB_FIELD],
  },
  {
    id: 'linux-single',
    label: 'Linux single',
    subtitle: 'Docker, одиночный',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateSingleNodeDocker',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateSingleNodeDocker`,
    fields: [...BASE_FIELDS],
  },
  {
    id: 'linux-saas',
    label: 'Linux SaaS',
    subtitle: 'Docker, SaaS',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateSaasSingleNodeDocker',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateSaasSingleNodeDocker`,
    fields: [...BASE_FIELDS],
  },
  {
    id: 'linux-tantor-single',
    label: 'Linux Tantor single',
    subtitle: 'Docker + Tantor, одиночный',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateSingleNodeDockerTantordb',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateSingleNodeDockerTantordb`,
    fields: [...BASE_FIELDS],
  },
  {
    id: 'linux-tantor-saas',
    label: 'Linux Tantor SaaS',
    subtitle: 'Docker + Tantor, SaaS',
    buildTypeId: 'CasePro_UniversalDeploy_DeployOrUpdateSaasSingleNodeDockerTantordb',
    buildConfigUrl: `${OTE_CREATION_TC_ORIGIN}/buildConfiguration/CasePro_UniversalDeploy_DeployOrUpdateSaasSingleNodeDockerTantordb`,
    fields: [...BASE_FIELDS],
  },
]

/**
 * @param {string} presetId
 */
export function getOteCreationPreset(presetId) {
  return OTE_CREATION_PRESETS.find((p) => p.id === presetId) || null
}
