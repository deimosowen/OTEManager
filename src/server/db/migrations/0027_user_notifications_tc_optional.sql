/*
  После 0013: `tc_creation_id` NOT NULL и табличный UNIQUE(user_key, tc_creation_id, kind).

  Нужно: nullable `tc_creation_id`; частичный UNIQUE только при заданном tc.

  Пересборка через временную таблицу.

  Обязательно маркеры разрыва Drizzle (строка вида «два минуса, уголок, пробел, statement-breakpoint») между операторами —
  иначе libSQL в migrate() шлёт весь файл одним prepare(), SQLite выполняет только первый оператор. См. также 0014_rbac_roles.sql.
*/
DROP TABLE IF EXISTS `user_notifications_migrate_tmp`;
--> statement-breakpoint
CREATE TABLE `user_notifications_migrate_tmp` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `created_at` integer NOT NULL,
  `read_at` integer,
  `user_key` text(256) NOT NULL,
  `kind` text(64) NOT NULL,
  `title` text(512) NOT NULL,
  `body` text(2048),
  `href` text(1024) NOT NULL DEFAULT '/',
  `tc_creation_id` integer
);
--> statement-breakpoint
INSERT INTO `user_notifications_migrate_tmp` (`id`, `created_at`, `read_at`, `user_key`, `kind`, `title`, `body`, `href`, `tc_creation_id`)
SELECT `id`, `created_at`, `read_at`, `user_key`, `kind`, `title`, `body`, `href`, `tc_creation_id` FROM `user_notifications`;
--> statement-breakpoint
DROP TABLE `user_notifications`;
--> statement-breakpoint
ALTER TABLE `user_notifications_migrate_tmp` RENAME TO `user_notifications`;
--> statement-breakpoint
CREATE INDEX `user_notifications_user_created_idx` ON `user_notifications` (`user_key`, `created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_notifications_user_tc_kind_uq` ON `user_notifications` (`user_key`, `tc_creation_id`, `kind`) WHERE `tc_creation_id` IS NOT NULL;
--> statement-breakpoint
DROP TABLE IF EXISTS `user_notifications_migrate_tmp`;
