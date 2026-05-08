CREATE TABLE `ote_user_list_column_prefs` (
  `user_key` text NOT NULL,
  `view_key` text NOT NULL DEFAULT 'env_yc',
  `prefs_json` text NOT NULL,
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`user_key`, `view_key`)
);

CREATE INDEX `ote_user_list_column_prefs_updated_idx`
  ON `ote_user_list_column_prefs` (`updated_at`);
