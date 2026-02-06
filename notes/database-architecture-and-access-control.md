# Curl Ticket Database Architecture & Access Control Notes

Updated: 2026-02-06

## 1. 目標與範圍

本文件整理目前專案的資料庫架構、API 授權設計、`project_members` 的多對多模型、RLS 導入策略，以及最近一次實作調整的重點。

適用範圍：

1. Nuxt + Nitro Server API
2. Drizzle ORM schema (`server/database/schema`)
3. Supabase Auth + PostgreSQL

---

## 2. 當前資料庫架構（Drizzle Schema）

### 2.1 `projects`

用途：專案主表

主要欄位：

1. `id` (uuid, PK)
2. `owner_id` (uuid, nullable for now)
3. `name` (varchar 100)
4. `key` (varchar 10, unique)
5. `description` (varchar 1000, nullable)
6. `environments` (text[], not null)
7. `created_at` (timestamptz)

索引：

1. `projects_created_at_idx` on `created_at desc`

檔案：`server/database/schema/projects.ts`

### 2.2 `project_members`

用途：專案與使用者的關聯表（多對多）

主要欄位：

1. `project_id` (uuid, FK -> projects.id, cascade delete)
2. `user_id` (uuid, FK -> auth.users.id in conceptual model)
3. `created_at` (timestamptz)

主鍵與索引：

1. `primary key (project_id, user_id)` 防止同一 user 重複加入同一 project
2. `project_members_user_id_idx` on `user_id`

檔案：`server/database/schema/project-members.ts`

### 2.3 `issues`

用途：專案下的問題追蹤資料

主要欄位：

1. `id` (serial, PK)
2. `project_id` (uuid, FK -> projects.id)
3. `issue_number` (int, project-scope number)
4. `project_key` (varchar 10)
5. `title`, `description`, `raw_curl`
6. request/response JSON 欄位
7. `status`
8. `created_by`
9. `created_at`, `updated_at`

索引：

1. `issues_project_stats_idx` on `(project_id, status, updated_at)`
2. `issues_project_issue_number_key` unique on `(project_id, issue_number)`

檔案：`server/database/schema/issues.ts`

### 2.4 `notifications`

用途：使用者通知（目前 schema 已有，功能面尚未完整接入）

主要欄位：

1. `id` (uuid, PK)
2. `user_id`
3. `issue_id` (FK -> issues.id)
4. `title`, `content`, `is_read`
5. `created_at`

檔案：`server/database/schema/notifications.ts`

---

## 3. 關聯模型與設計理由

### 3.1 為什麼需要 `project_members`

`Project` 與 `User` 是典型多對多：

1. 一個 project 可以有多個 user
2. 一個 user 也可以加入多個 project

如果只在 `projects` 放單一 `user_id`，只能支援一對多；若存陣列則不利於查詢、完整性與擴充。  
`project_members` 是正規化且可擴充的做法，後續可直接加 `role`, `invited_by`, `joined_at` 等欄位。

### 3.2 當前關聯摘要

1. `projects (1) -> (N) issues`
2. `projects (1) -> (N) project_members`
3. `auth.users (1) -> (N) project_members`
4. `issues (1) -> (N) notifications`

---

## 4. API 層授權設計（本次調整）

### 4.1 第一層：登入驗證

`server/middleware/auth.ts` 會驗證 Supabase user 並把 `userId` 放進 `event.context`。

### 4.2 第二層：Project 存取條件 helper

新增檔案：`server/utils/project-access.ts`

核心函式：

1. `buildMemberExistsCondition(userId)`
2. `buildProjectAccessCondition(userId)`
3. `getAccessibleProject(db, projectId, userId)`

存取規則：

1. `owner_id = userId` 可存取
2. 或 `project_members` 存在 `(project_id, user_id)` 可存取
3. 否則視同 `Project not found`（避免洩漏資源存在性）

### 4.3 第二層套用到哪些 API

已改造路由：

1. `server/api/projects/index.get.ts`（列表只看得到自己可存取的 project）
2. `server/api/projects/[projectId].get.ts`
3. `server/api/projects/[projectId]/issues/index.get.ts`
4. `server/api/projects/[projectId]/issues/index.post.ts`
5. `server/api/projects/[projectId]/issues/[issueId].get.ts`
6. `server/api/projects/[projectId]/issues/[issueId].patch.ts`

### 4.4 建立專案時同交易寫入 owner + member

已改：`server/api/projects/index.post.ts`

1. `projects.owner_id = currentUserId`
2. 同一個 transaction 新增 `project_members(project_id, user_id)`
3. 交易 callback 變數命名已由 `tx` 改為 `transaction`（可讀性更好）

---

## 5. `tx` 是什麼？為何改名

`db.transaction(async (tx) => { ... })` 內的 `tx` 是「交易上下文的 DB client」。

它的語義：

1. callback 內所有 SQL 在同一個 transaction
2. 任一步驟 throw error 會 rollback
3. 全部成功才 commit

為提升可讀性，已改為：

```ts
db.transaction(async (transaction) => {
  // ...
})
```

---

## 6. RLS 策略（建議）

目前已完成「API 層授權」，但 DB 層仍建議加 RLS 做第二道防線。

建議表別策略：

1. `projects`: 成員可讀，owner 可管理
2. `project_members`: 成員可讀，owner 可增刪
3. `issues`: 專案成員可讀寫，insert 應限制 `created_by = auth.uid()`
4. `notifications`: 僅 `user_id = auth.uid()` 可讀寫自己的通知

注意：專案目前 runtime 是 Drizzle 直連 DB，RLS 導入時需確認連線角色與 JWT claim 注入模式，避免誤判保護範圍。

---

## 7. Migration 建議流程

建議不要手改線上 DB，改用 migration 管理：

1. 調整 `server/database/schema/*.ts`
2. `pnpm db:generate -- --name <name>`
3. RLS/Function 用 custom migration  
   `pnpm db:generate -- --custom --name <name>`
4. 編輯 SQL 後執行 `pnpm db:migrate`
5. 視需要更新型別 `pnpm db:types`

---

## 8. 查詢效能與風險評估

### 8.1 已具備的索引優勢

1. `issues_project_stats_idx` 可支援 project issue 列表/統計查詢
2. `project_members` 主鍵 `(project_id, user_id)` 可支援 exists 子查詢
3. `project_members_user_id_idx` 可支援「查 user 參與哪些 project」

### 8.2 建議補強

`projects.owner_id` 目前無索引。  
因為列表會有 `owner_id = ? OR exists(...)` 條件，資料量大時建議加索引：

```sql
create index if not exists projects_owner_id_idx on public.projects(owner_id);
```

### 8.3 這次驗證結果

1. `pnpm typecheck` 通過
2. `pnpm lint` 通過
3. 曾嘗試連線 Supabase 跑 `EXPLAIN ANALYZE`，但當下環境 DNS 無法解析 DB host，未能取得線上實測執行計畫

---

## 9. 後續待辦清單

1. 產生並套用新增 schema 的 migration（若尚未執行）
2. 補 `projects.owner_id` 索引 migration
3. 規劃並實作 RLS custom migration
4. 規劃協作角色欄位（`project_members.role`）
5. 擴充成員管理 API（invite/list/remove）

