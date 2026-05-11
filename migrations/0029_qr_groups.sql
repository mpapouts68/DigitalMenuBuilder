CREATE TABLE `qr_groups` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `base_url` text NOT NULL,
  `pickup_point` text NOT NULL DEFAULT 'bar',
  `table_prefix` text NOT NULL DEFAULT 'T',
  `table_start` integer NOT NULL DEFAULT 1,
  `table_end` integer NOT NULL DEFAULT 20,
  `table_labels_text` text NOT NULL DEFAULT '',
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qr_groups_name_unique` ON `qr_groups` (`name`);
