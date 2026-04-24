CREATE TABLE `ote_create_saved_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`actor_login` text(256) NOT NULL,
	`actor_email` text(512) NOT NULL,
	`name` text(256) NOT NULL,
	`base_preset_id` text(64) NOT NULL,
	`deployment_template_id` integer,
	`properties_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ote_create_saved_configs_actor_updated_idx` ON `ote_create_saved_configs` (`actor_login`,`updated_at`);
