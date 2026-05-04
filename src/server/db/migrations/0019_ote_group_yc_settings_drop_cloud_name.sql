-- Убираем cloud_id и имя для поиска; остаётся только yc_folder_id.
CREATE TABLE `ote_group_yc_settings_new` (
  `group_id` integer PRIMARY KEY NOT NULL,
  `yc_folder_id` text(128) NOT NULL DEFAULT '',
  `updated_at` integer NOT NULL,
  `updated_by_user_key` text(256),
  FOREIGN KEY (`group_id`) REFERENCES `ote_app_groups`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `ote_group_yc_settings_new` (`group_id`, `yc_folder_id`, `updated_at`, `updated_by_user_key`)
SELECT `group_id`, `yc_folder_id`, `updated_at`, `updated_by_user_key` FROM `ote_group_yc_settings`;
--> statement-breakpoint
DROP TABLE `ote_group_yc_settings`;
--> statement-breakpoint
ALTER TABLE `ote_group_yc_settings_new` RENAME TO `ote_group_yc_settings`;
