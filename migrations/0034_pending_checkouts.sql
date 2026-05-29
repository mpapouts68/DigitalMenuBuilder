CREATE TABLE `pending_checkouts` (
  `id` text PRIMARY KEY NOT NULL,
  `viva_order_code` text,
  `amount_cents` integer NOT NULL,
  `cart_json` text NOT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `order_id` integer,
  `transaction_id` text,
  `failure_event_id` integer,
  `created_at` integer NOT NULL,
  `expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pending_checkouts_viva_order_code_idx` ON `pending_checkouts` (`viva_order_code`);
--> statement-breakpoint
CREATE INDEX `pending_checkouts_status_idx` ON `pending_checkouts` (`status`);
