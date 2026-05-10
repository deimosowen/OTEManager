-- Сценарии автоматизаций (граф блоков), область — группа каталога пользователя.
-- Между CREATE TABLE и индексом — statement-breakpoint (см. 0027 / 0014).
CREATE TABLE `ote_automation_scenarios` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `group_id` integer NOT NULL REFERENCES `ote_app_groups`(`id`) ON DELETE RESTRICT,
  `name` text(256) NOT NULL,
  `status` text(32) NOT NULL DEFAULT 'draft',
  `graph_json` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by_user_key` text(256) NOT NULL,
  `created_by_login` text(256) NOT NULL,
  `created_by_email` text(512) NOT NULL,
  `updated_by_user_key` text(256) NOT NULL,
  `updated_by_login` text(256) NOT NULL,
  `updated_by_email` text(512) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ote_automation_scenarios_group_updated_idx`
  ON `ote_automation_scenarios` (`group_id`, `updated_at`);
