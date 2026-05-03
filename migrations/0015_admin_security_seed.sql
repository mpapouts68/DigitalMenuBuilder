INSERT OR IGNORE INTO `admin_security` (`id`, `passcode_hash`, `updated_at`) VALUES (1, NULL, CAST(strftime('%s','now') AS integer) * 1000);
