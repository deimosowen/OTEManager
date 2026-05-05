/**
 * Подготовка SQLite для интеграционных тестов: миграции + минимальные строки (пользователь, группа, TC/YC, шаблон).
 * Импортируется из `tests/integration/api.spec.js`.
 */
import { existsSync, mkdirSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@libsql/client'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from '../../src/server/db/schema.js'
import { resolveMigrationsDir } from '../../src/server/db/resolve-migrations-dir.js'
import { INTEGRATION_PROVIDER } from '../../src/constants/integrations.js'
import { encryptIntegrationPayload } from '../../src/server/utils/integrations/crypto.js'

function filePathToLibsqlUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.startsWith('/')) return `file:${normalized}`
  if (/^[a-zA-Z]:\//.test(normalized)) return `file:///${normalized}`
  return `file:${normalized}`
}

/**
 * @param {string} dbFilePath
 * @param {string} sessionSecret
 * @param {{ teamcityBaseUrl?: string }} [options]
 */
export async function seedIntegrationDatabase(dbFilePath, sessionSecret, options = {}) {
  const tcBase = String(options.teamcityBaseUrl || 'http://127.0.0.1:8111')
    .trim()
    .replace(/\/+$/, '')
  const dir = path.dirname(dbFilePath)
  mkdirSync(dir, { recursive: true })
  if (existsSync(dbFilePath)) unlinkSync(dbFilePath)

  const url = filePathToLibsqlUrl(path.resolve(dbFilePath))
  const client = createClient({ url })
  const db = drizzle(client, { schema })

  const migrationsFolder = resolveMigrationsDir('')
  await migrate(db, { migrationsFolder })

  const [defaultGroup] = await db.select().from(schema.oteAppGroups).where(eq(schema.oteAppGroups.code, 'default')).limit(1)
  if (!defaultGroup) throw new Error('seed: нет группы default')

  const [userRole] = await db.select().from(schema.appRoles).where(eq(schema.appRoles.code, 'user')).limit(1)
  const [adminRole] = await db.select().from(schema.appRoles).where(eq(schema.appRoles.code, 'admin')).limit(1)
  if (!userRole || !adminRole) throw new Error('seed: нет ролей user/admin')

  const userKey = 'integration-test-user'
  const now = new Date()

  await db.insert(schema.oteDirectoryUsers).values({
    userKey,
    email: 'integration@test.invalid',
    login: userKey,
    displayName: 'Integration Test',
    groupId: defaultGroup.id,
    firstSeenAt: now,
    lastSeenAt: now,
  })

  await db.insert(schema.oteUserRoleAssignments).values([
    { userKey, roleId: userRole.id, assignedAt: now, assignedByUserKey: null },
    { userKey, roleId: adminRole.id, assignedAt: now, assignedByUserKey: null },
  ])

  // Строки для групп уже созданы миграциями (0017/0018); для теста подставляем свои URL и folder id.
  await db
    .update(schema.oteGroupTeamcitySettings)
    .set({
      tcRestBaseUrl: tcBase,
      tcUiBaseUrl: tcBase,
      startBuildTypeId: 'Integration_Start_BT',
      stopBuildTypeId: 'Integration_Stop_BT',
      deleteBuildTypeId: 'Integration_Delete_BT',
      modifyDeleteDateBuildTypeId: 'CasePro_UniversalDeploy_ModifyDateDelete',
      updatedAt: now,
      updatedByUserKey: userKey,
    })
    .where(eq(schema.oteGroupTeamcitySettings.groupId, defaultGroup.id))

  await db
    .update(schema.oteGroupYcSettings)
    .set({
      ycFolderId: 'integration-folder-id',
      updatedAt: now,
      updatedByUserKey: userKey,
    })
    .where(eq(schema.oteGroupYcSettings.groupId, defaultGroup.id))

  const cipherBlob = encryptIntegrationPayload(sessionSecret, { accessToken: 'integration-test-pat' })
  await db.insert(schema.userIntegrationCredentials).values({
    userLogin: userKey,
    provider: INTEGRATION_PROVIDER.TEAMCITY,
    cipherBlob,
    createdAt: now,
    updatedAt: now,
  })

  const [tpl] = await db
    .insert(schema.oteBuildTemplates)
    .values({
      name: 'Integration build template',
      description: '',
      teamcityBuildConfigUrl: 'http://example.invalid/buildType/Integration_Start_BT',
      teamcityBuildTypeId: 'Integration_Start_BT',
      yamlBody: 'metadata:\n  tag: "%metadata.tag%"\n',
      paramsJson: JSON.stringify({ 'metadata.tag': 'default-tag' }),
      isPersonal: 0,
      createdAt: now,
      updatedAt: now,
      createdByLogin: userKey,
      createdByEmail: 'integration@test.invalid',
      updatedByLogin: userKey,
      updatedByEmail: 'integration@test.invalid',
    })
    .returning({ id: schema.oteBuildTemplates.id })

  return {
    buildTemplateId: Number(tpl?.id),
    userKey,
    dbFilePath: path.resolve(dbFilePath),
  }
}

