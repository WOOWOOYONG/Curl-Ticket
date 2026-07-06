-- 建立唯一索引前，先清理既有重複 pending 邀請：
-- 同一組 (project_id, email) 只保留最新一筆 pending，其餘標記為 expired，
-- 否則 CREATE UNIQUE INDEX 會在既有重複資料上失敗、卡住部署。
UPDATE "project_invitations" AS pi
SET "status" = 'expired'
WHERE pi."status" = 'pending'
  AND pi."id" <> (
    SELECT keep."id"
    FROM "project_invitations" AS keep
    WHERE keep."project_id" = pi."project_id"
      AND keep."email" = pi."email"
      AND keep."status" = 'pending'
    ORDER BY keep."created_at" DESC, keep."id" DESC
    LIMIT 1
  );
--> statement-breakpoint
CREATE UNIQUE INDEX "project_invitations_pending_unique_idx" ON "project_invitations" USING btree ("project_id","email") WHERE "project_invitations"."status" = 'pending';
