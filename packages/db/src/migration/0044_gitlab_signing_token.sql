PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_repository` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path` text NOT NULL,
	`description` text,
	`provider` text NOT NULL,
	`webhook_secret` text,
	`webhook_signing_token` text,
	`language` text DEFAULT 'English' NOT NULL,
	`github_installation_id` integer,
	`github_repository_id` integer,
	`git_provider_access_id` integer,
	`git_provider_repository_id` integer,
	`access_token` text,
	`access_token_id` integer,
	`pr_enabled` integer DEFAULT true NOT NULL,
	`pr_min_access_level` integer DEFAULT 0 NOT NULL,
	`pr_review_enabled` integer DEFAULT true NOT NULL,
	`pr_inline_review` integer DEFAULT true NOT NULL,
	`pr_review_on_push` text DEFAULT 'on_every_push' NOT NULL,
	`pr_ignore_draft` integer DEFAULT true NOT NULL,
	`user_prompt` text,
	`pr_reply_enabled` integer DEFAULT true NOT NULL,
	`pr_mention_only` integer DEFAULT false NOT NULL,
	`issue_enabled` integer DEFAULT true NOT NULL,
	`issue_min_access_level` integer DEFAULT 0 NOT NULL,
	`issue_comment_on_open_enabled` integer DEFAULT true NOT NULL,
	`issue_label_on_open_enabled` integer DEFAULT true NOT NULL,
	`issue_reply_enabled` integer DEFAULT true NOT NULL,
	`issue_mention_only` integer DEFAULT false NOT NULL,
	`model_provider_id` integer,
	`model_name` text DEFAULT '' NOT NULL,
	`reasoning_effort` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`github_installation_id`) REFERENCES `github_installation`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`git_provider_access_id`) REFERENCES `git_provider_access`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`model_provider_id`) REFERENCES `model_provider`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_repository`("id", "path", "description", "provider", "webhook_secret", "webhook_signing_token", "language", "github_installation_id", "github_repository_id", "git_provider_access_id", "git_provider_repository_id", "access_token", "access_token_id", "pr_enabled", "pr_min_access_level", "pr_review_enabled", "pr_inline_review", "pr_review_on_push", "pr_ignore_draft", "user_prompt", "pr_reply_enabled", "pr_mention_only", "issue_enabled", "issue_min_access_level", "issue_comment_on_open_enabled", "issue_label_on_open_enabled", "issue_reply_enabled", "issue_mention_only", "model_provider_id", "model_name", "reasoning_effort", "created_at", "updated_at") SELECT "id", "path", "description", "provider", "webhook_secret", NULL, "language", "github_installation_id", "github_repository_id", "git_provider_access_id", "git_provider_repository_id", "access_token", "access_token_id", "pr_enabled", "pr_min_access_level", "pr_review_enabled", "pr_inline_review", "pr_review_on_push", "pr_ignore_draft", "user_prompt", "pr_reply_enabled", "pr_mention_only", "issue_enabled", "issue_min_access_level", "issue_comment_on_open_enabled", "issue_label_on_open_enabled", "issue_reply_enabled", "issue_mention_only", "model_provider_id", "model_name", "reasoning_effort", "created_at", "updated_at" FROM `repository`;--> statement-breakpoint
-- Preserve activity links when the migrator runs inside a transaction with foreign keys enabled
CREATE TEMP TABLE `repository_activity_backup` AS SELECT `id`, `repository_id` FROM `activity` WHERE `repository_id` IS NOT NULL;--> statement-breakpoint
DROP TABLE `repository`;--> statement-breakpoint
ALTER TABLE `__new_repository` RENAME TO `repository`;--> statement-breakpoint
UPDATE `activity` SET `repository_id` = (SELECT `repository_id` FROM `repository_activity_backup` WHERE `repository_activity_backup`.`id` = `activity`.`id`) WHERE `id` IN (SELECT `id` FROM `repository_activity_backup`);--> statement-breakpoint
DROP TABLE `repository_activity_backup`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `repository_gitProviderRepositoryId_gitProviderAccessId_unique` ON `repository` (`git_provider_repository_id`,`git_provider_access_id`);--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_webhook_signing_token` text;