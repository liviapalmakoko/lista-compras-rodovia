CREATE TABLE `shared_records` (
 `collection` text NOT NULL,
 `id` text NOT NULL,
 `body` text NOT NULL,
 `updated_at` integer NOT NULL,
 PRIMARY KEY (`collection`, `id`)
);
