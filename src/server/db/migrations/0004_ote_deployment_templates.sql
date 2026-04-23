CREATE TABLE `ote_deployment_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`yaml_body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_login` text NOT NULL,
	`created_by_email` text NOT NULL,
	`updated_by_login` text NOT NULL,
	`updated_by_email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ote_deployment_templates_slug_uq` ON `ote_deployment_templates` (`slug`);
--> statement-breakpoint
CREATE INDEX `ote_deployment_templates_updated_at_idx` ON `ote_deployment_templates` (`updated_at`);
