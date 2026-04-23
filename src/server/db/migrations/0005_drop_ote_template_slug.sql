DROP INDEX IF EXISTS `ote_deployment_templates_slug_uq`;
--> statement-breakpoint
ALTER TABLE `ote_deployment_templates` DROP COLUMN `slug`;
