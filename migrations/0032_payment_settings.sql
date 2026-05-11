CREATE TABLE `payment_settings` (
  `id` integer PRIMARY KEY NOT NULL,
  `card_enabled` integer NOT NULL DEFAULT 1,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `payment_settings` (`id`, `card_enabled`, `updated_at`)
VALUES (1, 1, CAST((julianday('now') - 2440587.5) * 86400000 AS integer));
