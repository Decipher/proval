PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_git_provider_access` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`access_token` text NOT NULL,
	`auto_create_enabled` integer DEFAULT false NOT NULL,
	`default_webhook_secret` text,
	`default_model_provider_id` integer,
	`default_model_name` text,
	`default_language` text,
	`default_pr_enabled` integer,
	`default_pr_min_access_level` integer,
	`default_pr_review_enabled` integer,
	`default_pr_inline_review` integer,
	`default_pr_review_on_push` text,
	`default_pr_ignore_draft` integer,
	`default_pr_reply_enabled` integer,
	`default_pr_mention_only` integer,
	`default_issue_enabled` integer,
	`default_issue_min_access_level` integer,
	`default_issue_comment_on_open_enabled` integer,
	`default_issue_label_on_open_enabled` integer,
	`default_issue_reply_enabled` integer,
	`default_issue_mention_only` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`default_model_provider_id`) REFERENCES `model_provider`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_git_provider_access`("id", "provider", "name", "base_url", "access_token", "auto_create_enabled", "default_webhook_secret", "default_model_provider_id", "default_model_name", "default_language", "default_pr_enabled", "default_pr_min_access_level", "default_pr_review_enabled", "default_pr_inline_review", "default_pr_review_on_push", "default_pr_ignore_draft", "default_pr_reply_enabled", "default_pr_mention_only", "default_issue_enabled", "default_issue_min_access_level", "default_issue_comment_on_open_enabled", "default_issue_label_on_open_enabled", "default_issue_reply_enabled", "default_issue_mention_only", "created_at", "updated_at") SELECT "id", "provider", "name", "base_url", "access_token", "auto_create_enabled", "default_webhook_secret", "default_model_provider_id", "default_model_name", "default_language", "default_pr_enabled", "default_pr_min_access_level", "default_pr_review_enabled", "default_pr_inline_review", "default_pr_review_on_push", "default_pr_ignore_draft", "default_pr_reply_enabled", "default_pr_mention_only", "default_issue_enabled", "default_issue_min_access_level", "default_issue_comment_on_open_enabled", "default_issue_label_on_open_enabled", "default_issue_reply_enabled", "default_issue_mention_only", "created_at", "updated_at" FROM `git_provider_access`;--> statement-breakpoint
DROP TABLE `git_provider_access`;--> statement-breakpoint
ALTER TABLE `__new_git_provider_access` RENAME TO `git_provider_access`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `git_provider_access_provider_baseUrl_unique` ON `git_provider_access` (`provider`,`base_url`);