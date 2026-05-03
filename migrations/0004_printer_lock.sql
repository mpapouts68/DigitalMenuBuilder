ALTER TABLE `printer_settings` ADD `lock_token` text;
--> statement-breakpoint
ALTER TABLE `printer_settings` ADD `lock_holder` text;
--> statement-breakpoint
ALTER TABLE `printer_settings` ADD `lock_acquired_at` integer;
--> statement-breakpoint
ALTER TABLE `printer_settings` ADD `lock_expires_at` integer;
