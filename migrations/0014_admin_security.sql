CREATE TABLE `admin_security` (
  `id` integer PRIMARY KEY NOT NULL,
  `passcode_hash` text,
  `updated_at` integer DEFAULT 0 NOT NULL
);