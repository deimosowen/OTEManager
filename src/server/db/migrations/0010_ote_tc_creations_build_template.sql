ALTER TABLE `ote_tc_creations` ADD COLUMN `build_template_id` integer;
--> statement-breakpoint
ALTER TABLE `ote_tc_creations` ADD COLUMN `request_template_yaml` text;
--> statement-breakpoint
ALTER TABLE `ote_tc_creations` ADD COLUMN `request_rendered_yaml` text;
--> statement-breakpoint
ALTER TABLE `ote_tc_creations` ADD COLUMN `request_params_json` text;
