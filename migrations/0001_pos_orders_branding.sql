CREATE TABLE `product_option_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`name` text NOT NULL,
	`is_required` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`price_delta` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_extras` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`name` text NOT NULL,
	`price_delta` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`print_status` text DEFAULT 'pending' NOT NULL,
	`customer_name` text,
	`customer_phone` text,
	`notes` text,
	`subtotal` real DEFAULT 0 NOT NULL,
	`extras_total` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT 0 NOT NULL,
	`printed_at` integer,
	`closed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`base_price` real NOT NULL,
	`quantity` integer NOT NULL,
	`notes` text,
	`line_total` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_item_modifiers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_item_id` integer NOT NULL,
	`modifier_type` text NOT NULL,
	`modifier_group_name` text,
	`modifier_name` text NOT NULL,
	`price_delta` real DEFAULT 0 NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `print_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT 0 NOT NULL,
	`processed_at` integer
);
--> statement-breakpoint
CREATE TABLE `daily_closures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_date` text NOT NULL,
	`total_orders` integer DEFAULT 0 NOT NULL,
	`gross_revenue` real DEFAULT 0 NOT NULL,
	`purge_before_date` text,
	`created_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `branding_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`logo_url` text,
	`footer_text` text,
	`primary_color` text,
	`secondary_color` text,
	`accent_color` text,
	`updated_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `branding_settings` (`id`, `logo_url`, `footer_text`, `primary_color`, `secondary_color`, `accent_color`, `updated_at`)
VALUES (1, NULL, NULL, NULL, NULL, NULL, CAST(strftime('%s','now') AS integer) * 1000);
