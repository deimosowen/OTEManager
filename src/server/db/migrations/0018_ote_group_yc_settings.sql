-- Yandex Cloud: folder id и cloud id по группе каталога (не env).
CREATE TABLE `ote_group_yc_settings` (
  `group_id` integer PRIMARY KEY NOT NULL,
  `yc_folder_id` text(128) NOT NULL DEFAULT '',
  `yc_cloud_id` text(128) NOT NULL DEFAULT '',
  `yandex_folder_name` text(512) NOT NULL DEFAULT '',
  `updated_at` integer NOT NULL,
  `updated_by_user_key` text(256),
  FOREIGN KEY (`group_id`) REFERENCES `ote_app_groups`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `ote_group_yc_settings` (`group_id`, `yc_folder_id`, `yc_cloud_id`, `yandex_folder_name`, `updated_at`)
SELECT `id`, '', '', '', 1778400000000
FROM `ote_app_groups`;
