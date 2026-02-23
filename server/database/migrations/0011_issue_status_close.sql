UPDATE "issues"
SET "status" = CASE
  WHEN "status" = 'open' THEN 'Open'
  WHEN "status" = 'in progress' THEN 'In Progress'
  WHEN "status" = 'done' THEN 'Done'
  WHEN "status" = 'close' THEN 'Close'
  ELSE "status"
END
WHERE "status" IN ('open', 'in progress', 'done', 'close');
--> statement-breakpoint
UPDATE "issues"
SET "status" = 'Open'
WHERE "status" NOT IN ('Open', 'In Progress', 'Done', 'Close');
--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "status" SET DEFAULT 'Open';
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_status_check" CHECK ("issues"."status" in ('Open', 'In Progress', 'Done', 'Close'));
