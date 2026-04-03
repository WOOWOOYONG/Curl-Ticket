ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_key_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "projects_key_active_idx" ON "projects" USING btree ("key") WHERE "projects"."deleted_at" is null;
