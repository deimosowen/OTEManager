CREATE TABLE `ote_tc_operation_pending` (
	`ote_resource_id` text(512) NOT NULL PRIMARY KEY,
	`action` text(32) NOT NULL,
	`queued_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`teamcity_build_id` text(32),
	`tc_auth_user_key` text(256) NOT NULL DEFAULT '',
	`tc_rest_base_url` text(2048) NOT NULL DEFAULT ''
);
