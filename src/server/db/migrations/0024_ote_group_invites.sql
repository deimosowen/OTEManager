CREATE TABLE `ote_group_invites` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `token_hash` text(64) NOT NULL,
  `group_id` integer NOT NULL,
  `created_at` integer NOT NULL,
  `expires_at` integer NOT NULL,
  `max_uses` integer NOT NULL DEFAULT 1,
  `use_count` integer NOT NULL DEFAULT 0,
  `created_by_user_key` text(256),
  `revoked` integer NOT NULL DEFAULT 0,
  FOREIGN KEY (`group_id`) REFERENCES `ote_app_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ote_group_invites_token_hash_uq` ON `ote_group_invites` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `ote_group_invites_group_id_idx` ON `ote_group_invites` (`group_id`);
--> statement-breakpoint
CREATE INDEX `ote_group_invites_expires_idx` ON `ote_group_invites` (`expires_at`);
