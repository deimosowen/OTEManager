/* Сценарий можно отключить без удаления (ручной запуск и будущие триггеры). */
ALTER TABLE `ote_automation_scenarios` ADD COLUMN `enabled` integer NOT NULL DEFAULT 1;
