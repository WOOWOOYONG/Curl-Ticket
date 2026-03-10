CREATE TABLE "device_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_code" text NOT NULL,
	"user_code" varchar(9) NOT NULL,
	"user_id" uuid,
	"token_plaintext" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_codes_device_code_unique" UNIQUE("device_code"),
	CONSTRAINT "device_codes_user_code_unique" UNIQUE("user_code")
);
--> statement-breakpoint
CREATE INDEX "device_codes_device_code_idx" ON "device_codes" USING btree ("device_code");--> statement-breakpoint
CREATE INDEX "device_codes_user_code_idx" ON "device_codes" USING btree ("user_code");