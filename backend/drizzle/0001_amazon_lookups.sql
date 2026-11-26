CREATE TABLE IF NOT EXISTS amazon_lookups (
  query_key TEXT PRIMARY KEY NOT NULL,
  body TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS amazon_lookup_locks (
  query_key TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS amazon_lookup_usage (
  day TEXT PRIMARY KEY NOT NULL,
  requests INTEGER NOT NULL
);
