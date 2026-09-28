CREATE TABLE `participants` (
	`code` text NOT NULL,
	`participant` text NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`code`, `participant`),
	FOREIGN KEY (`code`) REFERENCES `sessions`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`code` text PRIMARY KEY NOT NULL,
	`host_hash` text NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`phase` text DEFAULT 'open' NOT NULL,
	`deadline` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_expiry` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `votes` (
	`code` text NOT NULL,
	`stage` integer NOT NULL,
	`participant` text NOT NULL,
	`choices` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`code`, `stage`, `participant`),
	FOREIGN KEY (`code`) REFERENCES `sessions`(`code`) ON UPDATE no action ON DELETE cascade
);
