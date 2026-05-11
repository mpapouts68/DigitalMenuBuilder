ALTER TABLE `product_extras` ADD `group_name` text;
--> statement-breakpoint
ALTER TABLE `product_extras` ADD `max_quantity` integer NOT NULL DEFAULT 1;
