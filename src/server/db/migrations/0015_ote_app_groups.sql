-- Группы пользователей каталога; системная «Общая» назначается по умолчанию.
CREATE TABLE `ote_app_groups` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `code` text(64) NOT NULL,
  `name` text(256) NOT NULL,
  `is_system` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ote_app_groups_code_uq` ON `ote_app_groups` (`code`);
--> statement-breakpoint
INSERT INTO `ote_app_groups` (`code`, `name`, `is_system`, `created_at`, `updated_at`) VALUES
  ('default', 'Общая', 1, 1778100000000, 1778100000000);
--> statement-breakpoint
ALTER TABLE `ote_directory_users` ADD COLUMN `group_id` integer REFERENCES `ote_app_groups`(`id`);
--> statement-breakpoint
UPDATE `ote_directory_users` SET `group_id` = (SELECT `id` FROM `ote_app_groups` WHERE `code` = 'default' LIMIT 1) WHERE `group_id` IS NULL;
--> statement-breakpoint
CREATE INDEX `ote_directory_users_group_id_idx` ON `ote_directory_users` (`group_id`);
