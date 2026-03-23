ALTER TABLE "profiles" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "profiles_deleted_at_idx" ON "profiles" USING btree ("deleted_at");