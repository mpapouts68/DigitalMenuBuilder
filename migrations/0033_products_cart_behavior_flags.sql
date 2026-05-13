ALTER TABLE `products` ADD `prevent_remove_from_cart` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `products` ADD `disable_quantity_control` integer NOT NULL DEFAULT 0;
