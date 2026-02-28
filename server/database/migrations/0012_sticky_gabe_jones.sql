ALTER TABLE "issues" ALTER COLUMN "method" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "environment" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "issue_type" varchar(20) DEFAULT 'api_bug' NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_type_check" CHECK ("issues"."issue_type" in ('api_bug', 'task'));