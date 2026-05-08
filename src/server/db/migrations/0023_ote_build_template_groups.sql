CREATE TABLE `ote_build_template_groups` (
  `build_template_id` INTEGER NOT NULL,
  `group_id` INTEGER NOT NULL,
  PRIMARY KEY (`build_template_id`, `group_id`),
  FOREIGN KEY (`build_template_id`) REFERENCES `ote_build_templates`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `ote_app_groups`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `ote_bt_groups_group_idx` ON `ote_build_template_groups` (`group_id`);
