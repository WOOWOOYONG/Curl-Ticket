# 4. 資料庫設計 (Database Schema)

_基於 Supabase (PostgreSQL) + Drizzle ORM_

## Data Requirements

- `DATA-001`：系統需有 `profiles` 表儲存應用層用戶資料與角色資訊。
- `DATA-002`：系統需有 `invitation_codes` 表管理一次性邀請碼與使用狀態。
- `DATA-003`：系統需有 `project_invitations` 表追蹤專案邀請流程與到期狀態。
- `DATA-004`：系統需有 `project_members` 表管理專案成員（複合主鍵避免重複加入）。
- `DATA-005`：系統需有 `projects` 表，`key` 全域唯一，並保留可用環境設定。
- `DATA-006`：系統需有 `issues` 表，同時支援 `api_bug` 與 `task` 差異欄位。
- `DATA-007`：`issues` 需具備類型/狀態約束與查詢索引。
- `DATA-008`：系統需有 `notifications` 表支援 Issue 通知與專案邀請通知。
- `DATA-009`：Issue 需支援專案內連號機制（`issue_number`）。
- `DATA-010`：Issue 狀態變更需可由 DB Trigger 自動產生通知 `（Planned）`。
- `DATA-011`：`notifications` 表需啟用 Supabase Realtime publication。
- `DATA-012`：系統需有 `issue_comments` 表支援 Issue 留言功能，留言隨 Issue 級聯刪除。
- `DATA-013`：系統需有 `api_tokens` 表儲存 API Token 的 hash、名稱、使用紀錄，供 CLI 與外部整合使用。
- `DATA-014`：`issues` 表需支援 `api_bug` 的 Public Sharing 狀態；一個 Issue 最多有一個有效 Share Token。

## Tables

### users (Supabase Auth)

_(Supabase 內建 `auth.users`，本文件不重複定義欄位)_

### profiles

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | uuid | PK | 對應 `auth.users.id`（非自動產生） |
| `email` | varchar(255) | Unique, Not Null | 用戶 Email |
| `name` | varchar(255) |  | 用戶名稱 |
| `role` | varchar(20) | Not Null, Default `'user'` | 角色 (`admin` / `user`) |
| `created_at` | timestamp | Default `now()` | 建立時間 |
| `updated_at` | timestamp | Default `now()` | 更新時間 |
| `deleted_at` | timestamptz | | Soft-delete 時間戳（null = 未刪除） |

> 索引：`profiles_email_idx`、`profiles_role_idx`、`profiles_deleted_at_idx`。

### invitation_codes

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | uuid | PK, Default `gen_random_uuid()` | 邀請碼 ID |
| `code` | varchar(6) | Unique, Not Null | 6 位邀請碼（大寫英數字，排除易混淆字元） |
| `created_by` | uuid | Not Null | 產生邀請碼的 Admin |
| `used_by` | uuid |  | 使用邀請碼的用戶 |
| `is_used` | boolean | Default `false` | 是否已使用 |
| `expires_at` | timestamp |  | 過期時間 |
| `created_at` | timestamp | Default `now()` | 建立時間 |
| `used_at` | timestamp |  | 使用時間 |

### project_invitations

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | uuid | PK, Default `gen_random_uuid()` | 邀請 ID |
| `project_id` | uuid | FK -> `projects.id` (cascade delete) | 所屬專案 |
| `email` | varchar(255) | Not Null | 被邀請者 Email |
| `invited_by` | uuid | Not Null | 邀請者 |
| `status` | varchar(20) | Default `'pending'` | 狀態 (`pending` / `accepted` / `rejected` / `expired`) |
| `expires_at` | timestamp |  | 過期時間（預設建立後 7 天） |
| `created_at` | timestamp | Default `now()` | 建立時間 |
| `accepted_at` | timestamp |  | 接受時間 |

> 建議索引：`project_id`、`email`、`status`。

### project_members

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `project_id` | uuid | PK (composite), FK -> `projects.id` | 所屬專案 |
| `user_id` | uuid | PK (composite) | 成員用戶 ID |
| `created_at` | timestamp | Default `now()` | 加入時間 |

### projects

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | uuid | PK | 專案唯一識別碼 |
| `owner_id` | uuid | Not Null | 專案 Owner |
| `name` | varchar(100) | Not Null | 專案名稱 |
| `key` | varchar(10) | Unique, Not Null | 專案代號（如 `MEM`） |
| `description` | varchar(1000) |  | 專案描述 |
| `environments` | text[] | Not Null | 可用環境（Local, Dev, Staging, Prod） |
| `created_at` | timestamp | Default `now()` | 建立時間 |

### issues

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | serial | PK | 內部自增 ID |
| `project_id` | uuid | FK -> `projects.id` | 所屬專案 |
| `issue_number` | int | Not Null | 專案內流水號 |
| `project_key` | varchar(10) | Not Null | 冗餘欄位（顯示 Friendly ID） |
| `issue_type` | varchar(20) | Not Null, Default `'api_bug'` | Issue 類型 |
| `title` | varchar(200) | Not Null | 標題 |
| `description` | text |  | 描述 |
| `raw_curl` | text |  | 原始 cURL（`api_bug` 專用） |
| `method` | varchar(10) |  | HTTP Method（`api_bug` 專用） |
| `url` | text |  | API URL（`api_bug` 專用） |
| `environment` | varchar(10) | Default `'Dev'` | Local / Dev / Staging / Prod |
| `request_headers` | jsonb |  | Request Headers |
| `request_body` | jsonb |  | Request Body |
| `response_status` | int |  | HTTP Status Code |
| `response_body` | jsonb |  | Response Body |
| `status` | varchar(20) | Not Null, Default `'Open'` | 狀態 |
| `public_share_token` | text | Unique, Nullable | Public Issue Page 的不可猜測 Share Token（null = 未公開） |
| `public_shared_at` | timestamptz | Nullable | Public Sharing 啟用或重新產生連結的時間 |
| `created_by` | uuid | Not Null | 建立者 |
| `created_at` | timestamp | Default `now()` | 建立時間 |
| `updated_at` | timestamp | Default `now()` | 更新時間 |

> 約束與索引：
> - `issues_type_check`: `issue_type IN ('api_bug', 'task')`
> - `issues_status_check`: `status IN ('Open', 'In Progress', 'Done', 'Close')`
> - 複合唯一索引：`(project_id, issue_number)`
> - 唯一索引：`public_share_token`（非 null token 不可重複）
> - 複合索引：`(project_id, status, updated_at)`

### notifications

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | uuid | PK, Default `gen_random_uuid()` | 通知 ID |
| `user_id` | uuid | Not Null | 接收通知的人 |
| `issue_id` | int | FK -> `issues.id` (cascade delete) | 關聯 Issue（`issue_update`） |
| `type` | varchar(30) | Not Null, Default `'issue_update'` | 通知類型 |
| `project_invitation_id` | uuid | FK -> `project_invitations.id` (cascade delete) | 關聯邀請（`project_invite`） |
| `title` | varchar(200) | Not Null | 通知標題 |
| `content` | varchar(1000) |  | 通知內容 |
| `is_read` | boolean | Default `false` | 是否已讀 |
| `created_at` | timestamp | Default `now()` | 建立時間 |

### issue_comments

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | serial | PK | 留言 ID |
| `issue_id` | int | FK -> `issues.id` (cascade delete), Not Null | 所屬 Issue |
| `author_id` | uuid | Not Null | 留言者 |
| `content` | text | Not Null | 留言內容 |
| `created_at` | timestamp | Default `now()`, Not Null | 建立時間 |

> 索引：`(issue_id)`、`(issue_id, created_at)`

### api_tokens

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | uuid | PK, Default `gen_random_uuid()` | Token ID |
| `user_id` | uuid | FK → `profiles.id` (cascade delete), Not Null | 擁有者 |
| `name` | text | Not Null | 用途描述（如 "Claude Code - MacBook"） |
| `token_hash` | text | Not Null | SHA-256 hash |
| `prefix` | text | Not Null | 前 11 碼（如 `ct_a1b2c3de`） |
| `last_used_at` | timestamptz |  | 最後使用時間 |
| `expires_at` | timestamptz |  | 到期時間（null = 永不過期） |
| `created_at` | timestamptz | Not Null, Default `now()` | 建立時間 |

> 建議索引：`user_id`、`token_hash`。

## Traceability Matrix (Requirement ID -> Data)

| Requirement IDs | Data Objects | Validation / Constraint |
| --- | --- | --- |
| `AUTH-008` `AUTH-013` `AUTH-019` | `invitation_codes`, `profiles` | 邀請碼一次性 + 兌換後建立 Profile |
| `AUTH-016` `AUTH-021` | `profiles.role` | `admin` / `user` 角色檢查 |
| `AUTH-027` | `profiles.name` | Display Name 更新（長度上限） |
| `AUTH-032` `AUTH-035` | `profiles.deleted_at` | Soft-delete 與 restore 機制 |
| `PROJ-016` `PROJ-021` | `project_invitations` | 狀態集合 `pending/accepted/rejected/expired` + 去重驗證 |
| `PROJ-019` | `project_members` | 複合 PK 保證同成員不重複加入 |
| `ISSUE-004` `ISSUE-013` | `issues` 索引 `(project_id, status, updated_at)` | 專案範圍查詢與列表效能 |
| `ISSUE-017` `ISSUE-032` | `issues.issue_type` + API 專屬欄位 | `task` 禁止更新 API 專屬欄位（Server 驗證） |
| `ISSUE-006` `ISSUE-035` | `issues.issue_number`, `issues.project_key` | Friendly ID 來源欄位 |
| `ISSUE-060` ~ `ISSUE-078` | `issues.public_share_token`, `issues.public_shared_at` | Public Sharing opt-in、不可猜測 Share Link、停用後 token 清除 |
| `NOTIF-003` `NOTIF-004` | `notifications` | 最新 50 筆 + Realtime 訂閱 |
| `NOTIF-007` | `issues` + `notifications` | 狀態更新通知規則（DB Trigger 尚未落地，規格保留） |
| `NOTIF-008` | `project_invitations` + `notifications` | 專案邀請建立時產生通知 |
| `ISSUE-044` ~ `ISSUE-052` | `issue_comments` | Issue 留言 CRUD + 級聯刪除 |
| `NOTIF-009` | `issue_comments` + `notifications` | 留言時通知 Issue 建立者 |
| `TOKEN-001` ~ `TOKEN-005` | `api_tokens` | Token hash 儲存、prefix 辨識、過期與使用紀錄 |
| `TOKEN-008` ~ `TOKEN-013` | `api_tokens` + `profiles` | Bearer Token 驗證路徑，JOIN profiles 取得使用者資訊 |

## Backend Notes

1. `DATA-009`：Issue Numbering 需由 DB Trigger 或應用層交易確保 `max(issue_number) + 1` 的並發安全。
2. `DATA-010`：`[Planned]` 建立 Postgres Function `notify_issue_status_change` 並在 `issues` 上設定 `AFTER UPDATE` Trigger；當 `OLD.status != NEW.status` 時寫入 `notifications`。
3. `DATA-011`：需在 Supabase 執行：

```sql
alter publication supabase_realtime add table notifications;
```
