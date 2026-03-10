# API Token 系統

## 範圍

本文件涵蓋 API Token 資料模型、Bearer Token 驗證機制、Device Code Flow 登入、Token 管理 API 與站台 UI。

---

## A1. Token 資料模型

- `TOKEN-001`：系統需有 `api_tokens` 資料表儲存 Token 的 hash、名稱、使用紀錄。
- `TOKEN-002`：Token 明碼永不儲存於資料庫，僅儲存 SHA-256 hash。
- `TOKEN-003`：每筆 Token 需記錄 `prefix`（前 11 碼，如 `ct_a1b2c3d`），用於 UI 辨識。
- `TOKEN-004`：每筆 Token 支援可選的到期時間 `expires_at`。
- `TOKEN-005`：每筆 Token 需記錄 `last_used_at`，於驗證成功時非同步更新。

### api_tokens 資料表

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `id` | uuid | PK, Default `gen_random_uuid()` | Token ID |
| `user_id` | uuid | FK → `profiles.id` (cascade delete), Not Null | 擁有者 |
| `name` | text | Not Null | 用途描述（如 "Claude Code - MacBook"） |
| `token_hash` | text | Not Null | SHA-256 hash |
| `prefix` | text | Not Null | 前 11 碼（如 `ct_a1b2c3d`） |
| `last_used_at` | timestamptz | | 最後使用時間 |
| `expires_at` | timestamptz | | 到期時間（null = 永不過期） |
| `created_at` | timestamptz | Not Null, Default `now()` | 建立時間 |

建議索引：`api_tokens_user_id_idx`（user_id）、`api_tokens_token_hash_idx`（token_hash）。

## A2. Token 格式

- `TOKEN-006`：Token 格式為 `ct_` 前綴 + 64 字元隨機 hex 字串（`crypto.randomBytes(32)`），完整長度 67 字元。
- `TOKEN-007`：Token 產生後僅回傳明碼一次，後續 API 不提供明碼查詢。

### 工具函式

```typescript
// server/utils/api-token.ts
import { createHash, randomBytes } from 'node:crypto'

const TOKEN_PREFIX = 'ct_'

export function generateApiToken() {
  const raw = randomBytes(32).toString('hex')
  const token = `${TOKEN_PREFIX}${raw}`
  const tokenHash = hashToken(token)
  const prefix = token.slice(0, 11)
  return { token, tokenHash, prefix }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
```

---

## A3. Auth Middleware 擴充

- `TOKEN-008`：`server/middleware/auth.ts` 需在 Supabase session 驗證之前，檢測 `Authorization: Bearer ct_*` header。
- `TOKEN-009`：Bearer Token 路徑需查詢 `api_tokens` 表（以 hash 比對），並 JOIN `profiles` 取得使用者資訊。
- `TOKEN-010`：Token 過期（`expires_at < now()`）時回傳 `401 Invalid or expired token`。
- `TOKEN-011`：Token 驗證成功後，設定 `event.context.userId` 與 `event.context.profile`，與 Supabase session 路徑行為一致。
- `TOKEN-012`：Token 驗證成功後，非同步更新 `last_used_at`（fire-and-forget，不阻塞回應）。
- `TOKEN-013`：Token 繼承使用者既有的 project access 權限（owner / member），不額外提權。

### 流程分支

```
收到 /api/* 請求
  ├── 在 publicRoutes 中？ → 放行
  ├── Authorization header 為 Bearer ct_* ？
  │   ├── hash 比對 api_tokens → 成功 → 設定 context，放行
  │   └── 失敗或過期 → 401
  ├── 在 deviceCodeRoutes 中？ → 放行（見 A5）
  └── 既有 Supabase session 驗證（不變）
```

---

## A4. Token 管理 API

- `TOKEN-014`：`POST /api/tokens` — 建立新 Token。需驗證 Supabase session（僅站台 UI 可操作）。
- `TOKEN-015`：`POST /api/tokens` 回傳完整明碼（僅此一次），以及 prefix、name、expiresAt。
- `TOKEN-016`：`POST /api/tokens` 回傳 message 提醒使用者立即複製。
- `TOKEN-017`：每位使用者最多 5 組有效 Token，超過時回傳 `400`。
- `TOKEN-018`：`GET /api/tokens` — 列出使用者所有 Token（回傳 prefix、name、lastUsedAt、expiresAt、createdAt，不含明碼或 hash）。Token 遺失無法找回，需撤銷後重新產生。
- `TOKEN-019`：`DELETE /api/tokens/:tokenId` — 撤銷指定 Token。僅 Token 擁有者可操作。
- `TOKEN-020`：Token 管理 API 路徑不列入 `authOnlyRoutes`，需要完整 profile 才可操作。
- `TOKEN-021`：Token 管理 API 僅接受 Supabase session 驗證，不允許用 Bearer Token 呼叫（不可用 Token 管理 Token）。

### Validation Schema

- `TOKEN-022`：新增 `shared/schemas/api-token.ts`，包含 `createTokenSchema`。
- `TOKEN-023`：`createTokenSchema` 欄位：`name`（string, min 1, max 100）、`expiresInDays`（int, min 1, max 365, nullish）。

---

## A5. Device Code Flow（CLI 登入）

Device Code Flow 讓 CLI 使用者透過瀏覽器完成 OAuth 登入，不需手動複製 Token。參考 GitHub CLI（`gh auth login`）與 OAuth 2.0 Device Authorization Grant（RFC 8628）。

### 時序流程

```
CLI                            Curl Ticket 站台                   瀏覽器
 │                                   │                              │
 │  POST /api/auth/device/code       │                              │
 │  { url: "https://..." }           │                              │
 │ ─────────────────────────────►    │                              │
 │                                   │                              │
 │  { deviceCode, userCode,          │                              │
 │    verificationUrl, expiresIn,    │                              │
 │    interval }                     │                              │
 │ ◄─────────────────────────────    │                              │
 │                                   │                              │
 │  印出網址 + 代碼                   │                              │
 │  嘗試開啟瀏覽器 ─────────────────────────────────────────────►   │
 │                                   │                     開啟 /auth/device
 │                                   │                              │
 │  每 {interval} 秒 poll:           │           使用者輸入 userCode │
 │  POST /api/auth/device/token      │           使用者 Google OAuth │
 │  { deviceCode }                   │                     登入成功  │
 │ ─────────────────────────────►    │                              │
 │                                   │  站台產生 Token               │
 │  { status: "complete",            │  標記 deviceCode 已驗證       │
 │    token: "ct_xxx" }              │                              │
 │ ◄─────────────────────────────    │  顯示「登入成功，可關閉此頁」  │
 │                                   │                              │
 │  儲存 token 至本地 config          │                              │
 │  繼續執行原指令                    │                              │
```

### Device Code 資料模型

- `TOKEN-024`：系統需有 `device_codes` 資料表（或使用記憶體/Redis 短期儲存）。
- `TOKEN-025`：Device Code 有效期為 5 分鐘。過期的 device code 不可兌換。

#### device_codes 資料表

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `id` | uuid | PK, Default `gen_random_uuid()` | |
| `device_code` | text | Unique, Not Null | 隨機字串，CLI 用於 polling |
| `user_code` | varchar(9) | Unique, Not Null | 使用者輸入的短代碼（如 `ABCD-EFGH`） |
| `user_id` | uuid | | 驗證完成後填入 |
| `token_hash` | text | | 驗證完成後產生的 Token hash |
| `token_prefix` | text | | Token prefix |
| `status` | varchar(20) | Not Null, Default `'pending'` | `pending` / `complete` / `expired` |
| `expires_at` | timestamptz | Not Null | 到期時間 |
| `created_at` | timestamptz | Not Null, Default `now()` | |

### Device Code API

- `TOKEN-026`：`POST /api/auth/device/code` — 產生 device code + user code。此 endpoint 為公開路由（不需驗證）。
- `TOKEN-027`：`POST /api/auth/device/code` 回傳 `{ deviceCode, userCode, verificationUrl, expiresIn, interval }`。`verificationUrl` 為 `{站台網址}/auth/device`。`interval` 為建議 polling 間隔秒數（預設 5）。
- `TOKEN-028`：`user_code` 格式為 8 位大寫英數字，以 `-` 分為兩組（如 `ABCD-EFGH`），排除易混淆字元（0/O、1/I/L）。
- `TOKEN-029`：`POST /api/auth/device/token` — CLI polling 用。以 `deviceCode` 查詢狀態。此 endpoint 為公開路由。
- `TOKEN-030`：`POST /api/auth/device/token` 回傳值依狀態而定：`pending` → `{ status: "pending" }`；`complete` → `{ status: "complete", token: "ct_xxx", url: "..." }`；`expired` → `{ status: "expired" }`。
- `TOKEN-031`：`complete` 狀態時回傳的 token 明碼僅此一次。同一 deviceCode 第二次 poll `complete` 時不再回傳 token，僅回傳 `{ status: "consumed" }`。

### Device Code 驗證頁面

- `TOKEN-032`：新增頁面 `/auth/device`。
- `TOKEN-033`：頁面提供 user code 輸入框（8 位，自動轉大寫、自動插入 `-`）。
- `TOKEN-034`：輸入 user code 後，若使用者尚未登入，導向 Google OAuth。OAuth 完成後回到 `/auth/device` 並自動完成驗證。
- `TOKEN-035`：輸入 user code 後，若使用者已登入，直接完成驗證。
- `TOKEN-036`：驗證流程：比對 user code → 確認未過期 → 產生 API Token（name 為 `CLI - {日期}`，有效期 90 天）→ 更新 device_codes 記錄為 `complete`。
- `TOKEN-037`：驗證完成後頁面顯示「登入成功，可以關閉此頁面回到終端機」。
- `TOKEN-038`：user code 無效或已過期時顯示錯誤提示，允許重新輸入。

### 過期清理

- `TOKEN-039`：過期的 device_codes 記錄需定期清理。可在 `POST /api/auth/device/code` 時順便清理 1 小時前的過期記錄（lazy cleanup）。

---

## A6. Token 管理 UI

- `TOKEN-040`：新增頁面路徑為 `/settings/tokens`。
- `TOKEN-041`：頁面需列出使用者所有 Token，顯示 prefix、名稱、最後使用時間、到期時間、建立時間。
- `TOKEN-042`：提供「新增 Token」按鈕，開啟 Modal。
- `TOKEN-043`：Modal 表單包含：名稱（必填，max 100 字）、有效天數（選填，1-365 天，留空為永不過期）。
- `TOKEN-044`：建立成功後，Modal 顯示完整 Token（monospace 字型），附「複製」按鈕。
- `TOKEN-045`：建立成功的 Modal 需顯示警告文字：「請立即複製此 Token，關閉後將無法再次查看。」
- `TOKEN-046`：建立成功的 Modal 在使用者點擊「複製」之前，不允許關閉（關閉按鈕 disabled，點擊 overlay 不關閉）。
- `TOKEN-047`：每筆 Token 提供「撤銷」按鈕，點擊後需二次確認。
- `TOKEN-048`：使用者選單（Header Avatar 下拉）需新增「API Tokens」入口連結至 `/settings/tokens`。

---

## A7. 安全考量

- `TOKEN-SEC-001`：Token 明碼僅在 `POST /api/tokens` response 和 Device Code Flow `complete` 回傳中出現，不存 DB、不寫 log。
- `TOKEN-SEC-002`：傳輸層依賴 HTTPS 加密（Vercel 預設強制 HTTPS）。
- `TOKEN-SEC-003`：Token 撤銷即時生效（下次 API 請求即失敗）。
- `TOKEN-SEC-004`：Token 管理 API 僅接受 Supabase session 驗證（不允許用 Token 管理 Token）。
- `TOKEN-SEC-005`：Device Code API 為公開路由，需以 rate limit 防止暴力列舉 user code。建議對 `/api/auth/device/token` 限制單一 IP 每分鐘 12 次。
- `TOKEN-SEC-006`：Device Code Flow 產生的 Token 預設 90 天有效期，平衡安全性與使用便利。

---

## Cross-References

- 認證架構：見 [auth.md](../auth.md) `AUTH-001`（Google OAuth）、`AUTH-021`（角色系統）
- Profile 系統：見 [auth.md](../auth.md) `AUTH-023`（profile 建立）
- 資料模型變更：需同步更新 [data-model.md](../data-model.md)，新增 `api_tokens` 和 `device_codes` 表
- CLI 如何呼叫 auth：見 [cli.md](./cli.md) `CLI-017` ~ `CLI-027`
