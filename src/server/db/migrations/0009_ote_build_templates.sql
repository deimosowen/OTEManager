CREATE TABLE `ote_build_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256) NOT NULL,
	`description` text,
	`teamcity_build_config_url` text(2048) NOT NULL,
	`teamcity_build_type_id` text(256) NOT NULL,
	`yaml_body` text NOT NULL,
	`params_json` text NOT NULL,
	`is_personal` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_login` text(256) NOT NULL,
	`created_by_email` text(512) NOT NULL,
	`updated_by_login` text(256) NOT NULL,
	`updated_by_email` text(512) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ote_build_templates_updated_at_idx` ON `ote_build_templates` (`updated_at`);
