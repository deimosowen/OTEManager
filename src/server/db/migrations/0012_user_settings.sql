CREATE TABLE `user_settings` (
  `user_login` text(256) PRIMARY KEY NOT NULL,
  `timezone` text(128) NOT NULL DEFAULT 'UTC',
  `updated_at` integer
);
