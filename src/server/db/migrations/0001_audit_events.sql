CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`occurred_at` integer NOT NULL,
	`action_code` text(128) NOT NULL,
	`actor_login` text(256) NOT NULL,
	`actor_email` text(512) NOT NULL,
	`ote_resource_id` text(512),
	`ote_tag` text(512),
	`details_json` text
);
--> statement-breakpoint
CREATE INDEX `audit_events_occurred_at_idx` ON `audit_events` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_events_ote_resource_occurred_idx` ON `audit_events` (`ote_resource_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_events_action_occurred_idx` ON `audit_events` (`action_code`,`occurred_at`);