CREATE TABLE `printer_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`printer_ip` text,
	`printer_port` integer DEFAULT 9100 NOT NULL,
	`poll_interval_ms` integer DEFAULT 3000 NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `printer_settings` (`id`, `enabled`, `printer_ip`, `printer_port`, `poll_interval_ms`, `updated_at`)
VALUES (1, 0, NULL, 9100, 3000, CAST(strftime('%s','now') AS integer) * 1000);
