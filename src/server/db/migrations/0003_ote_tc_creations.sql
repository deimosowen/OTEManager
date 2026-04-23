CREATE TABLE `ote_tc_creations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`actor_login` text(256) NOT NULL,
	`actor_email` text(512) NOT NULL,
	`preset_id` text(64) NOT NULL,
	`build_type_id` text(256) NOT NULL,
	`teamcity_build_id` text(32),
	`teamcity_web_url` text(1024),
	`status` text(32) NOT NULL DEFAULT 'queued',
	`request_properties_json` text,
	`metadata_tag` text(512),
	`caseone_version` text(512),
	`deployment_result_json` text,
	`rabbit_url` text(1024),
	`saas_app_url` text(1024),
	`caseone_url` text(1024),
	`last_error` text(2048)
);
--> statement-breakpoint
CREATE INDEX `ote_tc_creations_actor_created_idx` ON `ote_tc_creations` (`actor_login`,`created_at`);--> statement-breakpoint
CREATE INDEX `ote_tc_creations_status_idx` ON `ote_tc_creations` (`status`,`created_at`);
