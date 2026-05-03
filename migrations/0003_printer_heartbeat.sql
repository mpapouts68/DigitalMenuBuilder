ALTER TABLE `printer_settings` ADD `last_seen_at` integer;
--> statement-breakpoint
ALTER TABLE `printer_settings` ADD `last_status` text;
--> statement-breakpoint
ALTER TABLE `printer_settings` ADD `last_error` text;
