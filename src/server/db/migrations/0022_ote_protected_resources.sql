CREATE TABLE `ote_protected_resources` (
	`ote_resource_id` text(512) NOT NULL PRIMARY KEY,
	`marked_at` integer NOT NULL,
	`marked_by_user_key` text(256) NOT NULL
);
