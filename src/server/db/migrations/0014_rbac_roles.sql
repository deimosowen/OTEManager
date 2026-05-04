-- Справочник ролей (расширяемый). Разбивка на statement-breakpoint — иначе libSQL batch может применить только первый фрагмент.
CREATE TABLE `app_roles` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `code` text(64) NOT NULL,
  `label` text(128) NOT NULL,
  `description` text,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_roles_code_uq` ON `app_roles` (`code`);
--> statement-breakpoint
CREATE TABLE `ote_directory_users` (
  `user_key` text(256) PRIMARY KEY NOT NULL,
  `email` text(512) NOT NULL,
  `login` text(256) NOT NULL DEFAULT '',
  `display_name` text(512) NOT NULL DEFAULT '',
  `first_seen_at` integer NOT NULL,
  `last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ote_directory_users_email_idx` ON `ote_directory_users` (`email`);
--> statement-breakpoint
CREATE INDEX `ote_directory_users_last_seen_idx` ON `ote_directory_users` (`last_seen_at`);
--> statement-breakpoint
CREATE TABLE `ote_user_role_assignments` (
  `user_key` text(256) NOT NULL,
  `role_id` integer NOT NULL,
  `assigned_at` integer NOT NULL,
  `assigned_by_user_key` text(256),
  PRIMARY KEY (`user_key`, `role_id`),
  FOREIGN KEY (`role_id`) REFERENCES `app_roles`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `ote_user_role_assignments_role_idx` ON `ote_user_role_assignments` (`role_id`);
--> statement-breakpoint
INSERT INTO `app_roles` (`code`, `label`, `description`, `sort_order`, `created_at`) VALUES
  ('user', 'Пользователь', 'Базовый доступ к приложению', 10, 1777900000000),
  ('admin', 'Администратор', 'Управление пользователями и системными настройками', 20, 1777900000001);
