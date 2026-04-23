import { runtimeConfigString } from './config-helpers.js'
import { parseCommaSeparatedKeys } from './compute.js'

/**
 * Опции MVP (метки, URL, версии) из `useRuntimeConfig(event)` — один источник для списка и карточки OTE.
 * @param {import('@nuxt/schema').NitroRuntimeConfig} config
 */
export function buildMvpOptsFromRuntimeConfig(config) {
  const authorKey = runtimeConfigString(config.ycOteAuthorLabelKey, 'NUXT_YC_OTE_AUTHOR_LABEL') || 'run-by'
  const appHttps =
    String(runtimeConfigString(config.ycOteAppHttpsFromFqdn, 'NUXT_YC_OTE_APP_HTTPS_FROM_FQDN') || 'false').toLowerCase() ===
    'true'
  const vb = parseCommaSeparatedKeys(
    runtimeConfigString(config.ycOteVersionBackendLabelKeys, 'NUXT_YC_OTE_VERSION_BACKEND_LABELS'),
  )
  const vf = parseCommaSeparatedKeys(
    runtimeConfigString(config.ycOteVersionFrontendLabelKeys, 'NUXT_YC_OTE_VERSION_FRONTEND_LABELS'),
  )
  const appLab = parseCommaSeparatedKeys(runtimeConfigString(config.ycOteAppUrlLabelKeys, 'NUXT_YC_OTE_APP_URL_LABELS'))
  const appMeta = parseCommaSeparatedKeys(runtimeConfigString(config.ycOteAppUrlMetaKeys, 'NUXT_YC_OTE_APP_URL_META_KEYS'))
  const usernameKeysCsv = runtimeConfigString(config.ycTcUsernameLabelKeys, 'NUXT_YC_USERNAME_LABEL_KEYS')
  const delLabelCsv = runtimeConfigString(config.ycTcDeleteDateLabelKeys, 'NUXT_YC_DELETE_DATE_LABEL_KEYS')
  const delMetaCsv = runtimeConfigString(config.ycTcDeleteDateMetaKeys, 'NUXT_YC_DELETE_DATE_META_KEYS')
  const parsedUser = parseCommaSeparatedKeys(usernameKeysCsv)
  const parsedDelLabel = parseCommaSeparatedKeys(delLabelCsv)
  const parsedDelMeta = parseCommaSeparatedKeys(delMetaCsv)
  const appPublicUrlTemplate = runtimeConfigString(
    config.ycOteAppPublicUrlTemplate,
    'NUXT_YC_OTE_APP_PUBLIC_URL_TEMPLATE',
  )
  const tcConfigMetaKeys = parseCommaSeparatedKeys(
    runtimeConfigString(config.ycOteTcConfigMetaKeys, 'NUXT_YC_OTE_TC_CONFIG_META_KEYS'),
  )
  const tcConfigLabelKeys = parseCommaSeparatedKeys(
    runtimeConfigString(config.ycOteTcConfigLabelKeys, 'NUXT_YC_OTE_TC_CONFIG_LABEL_KEYS'),
  )
  const deploymentHistoryMetaKey = runtimeConfigString(
    config.ycOteDeploymentHistoryMetaKey,
    'NUXT_YC_OTE_DEPLOYMENT_HISTORY_META_KEY',
  )

  const tplHostMatch = String(appPublicUrlTemplate || '').match(/https?:\/\/\{[^}]+\}\.([^/\s"'<>]+)/i)
  const tplDerivedHost = tplHostMatch ? tplHostMatch[1].trim() : ''
  const explicitLinksHost = runtimeConfigString(config.public?.oteAppLinksHost, 'NUXT_PUBLIC_OTE_APP_LINKS_HOST')
  const appLinksHost = (explicitLinksHost || tplDerivedHost || 'devpravo.tech').replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const rabbitPortRaw = runtimeConfigString(config.public?.oteRabbitManagementPort, 'NUXT_PUBLIC_OTE_RABBIT_MANAGEMENT_PORT')
  const rabbitManagementPort = Math.min(65535, Math.max(1, Number(rabbitPortRaw) || 15672))

  return {
    authorLabelKey: authorKey,
    deleteLabelKeys: parsedDelLabel.length
      ? parsedDelLabel
      : ['delete-date', 'delete_date', 'delete-until', 'autodelete-date'],
    deleteMetaKeys: parsedDelMeta.length
      ? parsedDelMeta
      : ['delete-date', 'delete_date', 'deleteDate', 'autodelete-date'],
    versionBackendKeys: vb.length ? vb : ['caseone-version', 'caseone_version', 'backend-version', 'backend_version'],
    versionFrontendKeys: vf.length
      ? vf
      : ['frontend-version', 'frontend_version', 'ui-version', 'caseone-ui-version'],
    appUrlLabelKeys: appLab.length ? appLab : ['ote-url', 'app-url', 'public-url'],
    appUrlMetaKeys: appMeta.length ? appMeta : ['app_url', 'app-url', 'public_url'],
    appHttpsFromFqdn: appHttps,
    appPublicUrlTemplate,
    tcConfigMetaKeys,
    tcConfigLabelKeys,
    deploymentHistoryMetaKey,
    usernameLabelKeysForTc: parsedUser.length ? parsedUser : ['username', 'ldap-user', 'owner', 'login'],
    appLinksHost,
    rabbitManagementPort,
  }
}
