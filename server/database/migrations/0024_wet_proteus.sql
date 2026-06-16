ALTER TABLE "issues" ADD COLUMN "public_share_token" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "public_shared_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "issues_public_share_token_key" ON "issues" USING btree ("public_share_token") WHERE "issues"."public_share_token" is not null;