ALTER TABLE `git_provider_access` ADD `auto_create_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_webhook_secret` text;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_model_provider_id` integer REFERENCES model_provider(id);--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_model_name` text;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_language` text;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_pr_enabled` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_pr_min_access_level` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_pr_review_enabled` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_pr_inline_review` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_pr_review_on_push` text;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_pr_ignore_draft` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_pr_reply_enabled` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_pr_mention_only` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_issue_enabled` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_issue_min_access_level` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_issue_comment_on_open_enabled` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_issue_label_on_open_enabled` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_issue_reply_enabled` integer;--> statement-breakpoint
ALTER TABLE `git_provider_access` ADD `default_issue_mention_only` integer;
