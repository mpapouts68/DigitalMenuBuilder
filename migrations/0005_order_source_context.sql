ALTER TABLE `orders` ADD `service_mode` text DEFAULT 'pickup' NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `table_code` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD `table_label` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD `pickup_point` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD `source_token` text;
