CREATE TABLE `user_notifications` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `created_at` integer NOT NULL,
  `read_at` integer,
  `user_key` text(256) NOT NULL,
  `kind` text(64) NOT NULL,
  `title` text(512) NOT NULL,
  `body` text(2048),
  `href` text(1024) NOT NULL,
  `tc_creation_id` integer NOT NULL,
  UNIQUE(`user_key`, `tc_creation_id`, `kind`)
);

CREATE INDEX `user_notifications_user_created_idx` ON `user_notifications` (`user_key`, `created_at`);
