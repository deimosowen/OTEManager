-- TeamCity: REST/UI и buildTypeId для start/stop/delete — по группе пользователя (не env).
CREATE TABLE `ote_group_teamcity_settings` (
  `group_id` integer PRIMARY KEY NOT NULL,
  `tc_rest_base_url` text(2048) NOT NULL,
  `tc_ui_base_url` text(2048) NOT NULL,
  `start_build_type_id` text(512) NOT NULL,
  `stop_build_type_id` text(512) NOT NULL,
  `delete_build_type_id` text(512) NOT NULL,
  `updated_at` integer NOT NULL,
  `updated_by_user_key` text(256),
  FOREIGN KEY (`group_id`) REFERENCES `ote_app_groups`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `ote_group_teamcity_settings` (
  `group_id`,
  `tc_rest_base_url`,
  `tc_ui_base_url`,
  `start_build_type_id`,
  `stop_build_type_id`,
  `delete_build_type_id`,
  `updated_at`
)
SELECT
  `id`,
  'https://ci.pravo.tech',
  'https://ci.pravo.tech',
  'CasePro_UniversalDeploy_StartByTag',
  'CasePro_UniversalDeploy_StopByTag',
  'CasePro_UniversalDeploy_Delete',
  1778300000000
FROM `ote_app_groups`;
