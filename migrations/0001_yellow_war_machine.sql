CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`stage` integer NOT NULL,
	`participant` text NOT NULL,
	`parent_id` text,
	`choices` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `sessions`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_posts_room_stage` ON `posts` (`code`,`stage`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_posts_author` ON `posts` (`code`,`participant`,`created_at`);