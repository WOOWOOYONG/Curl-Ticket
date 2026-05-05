DROP INDEX "profiles_email_idx";--> statement-breakpoint
DROP INDEX "profiles_role_idx";--> statement-breakpoint
DROP INDEX "profiles_deleted_at_idx";--> statement-breakpoint
DROP INDEX "invitation_codes_code_idx";--> statement-breakpoint
DROP INDEX "device_codes_device_code_idx";--> statement-breakpoint
DROP INDEX "device_codes_user_code_idx";--> statement-breakpoint
CREATE INDEX "projects_owner_id_active_idx" ON "projects" USING btree ("owner_id") WHERE "projects"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read","created_at" DESC NULLS LAST);