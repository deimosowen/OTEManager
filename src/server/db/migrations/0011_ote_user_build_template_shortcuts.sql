CREATE TABLE `ote_user_build_template_favorites` (
	`user_login` text(256) NOT NULL,
	`build_template_id` integer NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY (`user_login`, `build_template_id`)
);
--> statement-breakpoint
CREATE INDEX `ote_user_btfav_user_added_idx` ON `ote_user_build_template_favorites` (`user_login`, `added_at`);
--> statement-breakpoint
CREATE TABLE `ote_user_build_template_recent` (
	`user_login` text(256) NOT NULL,
	`build_template_id` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	PRIMARY KEY (`user_login`, `build_template_id`)
);
--> statement-breakpoint
CREATE INDEX `ote_user_btrec_user_time_idx` ON `ote_user_build_template_recent` (`user_login`, `last_used_at`);
