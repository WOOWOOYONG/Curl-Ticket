# 3.9 Claude Code 整合：API Token + CLI + Skill

## 範圍

本文件涵蓋三個子模組：API Token 驗證系統、`curl-ticket` CLI 工具、Claude Code Skill。三者共同實現「工程師在本地 codebase 透過 Claude Code 存取站台 issue 並定位程式碼問題」的完整流程。

## 背景與目標

Curl Ticket 的核心使用者是工程師。當工程師在站台看到 issue 後，需要回到本地 codebase 排查問題。目前的流程是手動在站台和 IDE 間切換、複製 cURL、人工搜尋相關程式碼。

本功能的目標是讓工程師在本地專案的 Claude Code 裡，直接以自然語言查詢站台 issue，由 Claude 自動結合 issue 資訊與本地程式碼進行問題定位。

### 使用者流程概述

```
1. 工程師在 Curl Ticket 站台「設定 → API Tokens」產生 Token
2. 在本地環境設定環境變數（CURL_TICKET_URL + CURL_TICKET_TOKEN）
3. 全域安裝 CLI（npm install -g @anthropic-ai/curl-ticket-cli）
4. 將 Skill 複製到專案 .claude/skills/（一次性）
5. 在 Claude Code 中直接對話：「看一下 open 的 issue」
   → Claude 自動執行 CLI 取得 issue → 在本地 codebase 搜尋對應程式碼 → 輸出分析與修復建議
```

### 架構選型：CLI + Skill（而非 MCP Server）

選擇 CLI + Skill 而非 MCP Server 的原因是 **token 效率**：

| 項目 | MCP Server | CLI + Skill |
|------|-----------|-------------|
| 固定成本（每次對話） | ~1,000 tokens（所有 tool schema 常駐） | ~60 tokens（僅 Skill metadata） |
| 不使用時的成本 | ~1,000 tokens（照樣佔據 context） | ~60 tokens |
| 觸發後載入成本 | 0 | ~300 tokens（SKILL.md body） |
| 單次呼叫封裝開銷 | ~80 tokens（JSON-RPC） | ~15 tokens（Bash 指令） |
| 典型工作流（列表 + 2 筆詳情） | ~1,320 + 回傳資料 | ~375 + 回傳資料 |

CLI 方案讓 Claude Code 直接透過已有的 Bash tool 執行指令，不需額外註冊 tool schema，省下的 context 空間可用於分析更多程式碼。

---

## 模組 A：API Token 系統

### 功能需求

#### A1. Token 資料模型

- `TOKEN-001`：系統需有 `api_tokens` 資料表儲存 Token 的 hash、名稱、使用紀錄。
- `TOKEN-002`：Token 明碼永不儲存於資料庫，僅儲存 SHA-256 hash。
- `TOKEN-003`：每筆 Token 需記錄 `prefix`（前 11 碼，如 `ct_a1b2c3de`），用於 UI 辨識。
- `TOKEN-004`：每筆 Token 支援可選的到期時間 `expires_at`。
- `TOKEN-005`：每筆 Token 需記錄 `last_used_at`，於驗證成功時非同步更新。

#### A2. Token 格式

- `TOKEN-006`：Token 格式為 `ct_` 前綴 + 64 字元隨機 hex 字串（`crypto.randomBytes(32)`），完整長度 67 字元。
- `TOKEN-007`：Token 產生後僅回傳明碼一次，後續 API 不提供明碼查詢。

#### A3. Auth Middleware 擴充

- `TOKEN-008`：`server/middleware/auth.ts` 需在 Supabase session 驗證之前，檢測 `Authorization: Bearer ct_*` header。
- `TOKEN-009`：Bearer Token 路徑需查詢 `api_tokens` 表（以 hash 比對），並 JOIN `profiles` 取得使用者資訊。
- `TOKEN-010`：Token 過期（`expires_at < now()`）時回傳 `401 Invalid or expired token`。
- `TOKEN-011`：Token 驗證成功後，設定 `event.context.userId` 與 `event.context.profile`，與 Supabase session 路徑行為一致。
- `TOKEN-012`：Token 驗證成功後，非同步更新 `last_used_at`（fire-and-forget，不阻塞回應）。
- `TOKEN-013`：Token 繼承使用者既有的 project access 權限（owner / member），不額外提權。
- `TOKEN-031`：若 `server/utils/errors.ts` 尚未提供 `unauthorized()` helper，需新增之（回傳 401），供 Bearer Token 驗證失敗時使用。

#### A4. Token 管理 API

- `TOKEN-014`：`POST /api/tokens` — 建立新 Token。需驗證 Supabase session（僅站台 UI 可操作）。
- `TOKEN-015`：`POST /api/tokens` 回傳完整明碼（僅此一次），以及 prefix、name、expiresAt。
- `TOKEN-016`：`POST /api/tokens` 回傳 message 提醒使用者立即複製。
- `TOKEN-017`：每位使用者最多 5 組有效 Token，超過時回傳 `400`。
- `TOKEN-018`：`GET /api/tokens` — 列出使用者所有 Token（回傳 prefix、name、lastUsedAt、expiresAt、createdAt，不含明碼或 hash）。
- `TOKEN-019`：`DELETE /api/tokens/:tokenId` — 撤銷指定 Token。僅 Token 擁有者可操作。
- `TOKEN-020`：Token 管理 API 路徑不列入 `authOnlyRoutes`，需要完整 profile 才可操作。

#### A5. Token 管理 UI

- `TOKEN-021`：新增頁面路徑為 `/settings/tokens`。
- `TOKEN-022`：頁面需列出使用者所有 Token，顯示 prefix、名稱、最後使用時間、到期時間、建立時間。
- `TOKEN-023`：提供「新增 Token」按鈕，開啟 Modal。
- `TOKEN-024`：Modal 表單包含：名稱（必填，max 100 字）、有效天數（選填，1-365 天，留空為永不過期）。
- `TOKEN-025`：建立成功後，Modal 顯示完整 Token（monospace 字型），附「複製」按鈕。
- `TOKEN-026`：建立成功的 Modal 需顯示警告文字：「請立即複製此 Token，關閉後將無法再次查看。」
- `TOKEN-027`：每筆 Token 提供「撤銷」按鈕，點擊後需二次確認。
- `TOKEN-028`：使用者選單（Header Avatar 下拉）需新增「API Tokens」入口連結至 `/settings/tokens`。

#### A6. Validation Schema

- `TOKEN-029`：新增 `shared/schemas/api-token.ts`，包含 `createTokenSchema`。
- `TOKEN-030`：`createTokenSchema` 欄位：`name`（string, min 1, max 100）、`expiresInDays`（int, min 1, max 365, nullish）。

### 資料模型

#### api_tokens

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `id` | uuid | PK, Default `gen_random_uuid()` | Token ID |
| `user_id` | uuid | FK → `profiles.id` (cascade delete), Not Null | 擁有者 |
| `name` | text | Not Null | 用途描述（如 "Claude Code - MacBook"） |
| `token_hash` | text | Not Null | SHA-256 hash |
| `prefix` | text | Not Null | 前 11 碼（如 `ct_a1b2c3de`） |
| `last_used_at` | timestamptz | | 最後使用時間 |
| `expires_at` | timestamptz | | 到期時間（null = 永不過期） |
| `created_at` | timestamptz | Not Null, Default `now()` | 建立時間 |

建議索引：`user_id`、`token_hash`。

### 安全考量

- `TOKEN-SEC-001`：明碼僅在 `POST /api/tokens` 的 response 中出現一次，不存 DB、不寫 log。
- `TOKEN-SEC-002`：傳輸層依賴 HTTPS 加密（Vercel 預設強制 HTTPS）。
- `TOKEN-SEC-003`：Token 撤銷即時生效（下次 API 請求即失敗）。
- `TOKEN-SEC-004`：Token 管理 API 僅接受 Supabase session 驗證（不允許用 Token 管理 Token）。
- `TOKEN-SEC-005`：Auth middleware 在 Bearer Token 驗證成功後，需設定 `event.context.authMethod = 'api_token'`。Token 管理 API（`/api/tokens`）需檢查此標記，若 `authMethod === 'api_token'` 則回傳 `403 Token-based access not allowed for token management`。

---

## 模組 B：CLI 工具（`curl-ticket-cli`）

### 功能需求

#### B1. 套件基本資訊

- `CLI-001`：npm 套件名稱為 `@anthropic-ai/curl-ticket-cli`（暫定，視發佈帳號調整）。
- `CLI-002`：安裝後提供全域指令 `curl-ticket`。
- `CLI-003`：CLI 需從環境變數讀取設定：`CURL_TICKET_URL`（站台網址）、`CURL_TICKET_TOKEN`（API Token）。
- `CLI-004`：環境變數缺失時，輸出明確錯誤訊息並以 exit code 1 結束。

#### B2. 子指令定義

- `CLI-005`：`curl-ticket projects` — 列出使用者可存取的所有專案。
- `CLI-006`：`curl-ticket projects` 每筆輸出格式為 `{key}\t{name}\t({id})`，每行一筆。
- `CLI-007`：`curl-ticket issues <projectId>` — 列出指定專案的 issue 摘要。
- `CLI-008`：`curl-ticket issues` 支援選項 `--status, -s`（依狀態過濾：Open / In Progress / Done / Close）。亦支援 kebab-case alias（`in-progress` → `In Progress`），CLI 內部進行映射。
- `CLI-009`：`curl-ticket issues` 支援選項 `--type, -t`（依類型過濾：api_bug / task）。
- `CLI-010`：`curl-ticket issues` 支援選項 `--limit, -n`（筆數上限，預設 10，最大 20）。
- `CLI-044`：`curl-ticket issues` 支援選項 `--env, -e`（依環境過濾：Local / Dev / Staging / Prod）。
- `CLI-011`：`curl-ticket issues` 每筆輸出摘要格式為精簡純文字（見「輸出格式」章節）。
- `CLI-012`：`curl-ticket issue <projectId> <issueId>` — 取得單一 issue 詳情。
- `CLI-013`：`curl-ticket issue` 的 `<issueId>` 接受數字 ID 或 friendly ID（如 `CT-42`）。
- `CLI-014`：`curl-ticket issue` 輸出完整詳情的精簡格式（見「輸出格式」章節）。
- `CLI-015`：`curl-ticket update-status <projectId> <issueId> <status>` — 更新 issue 狀態。`<status>` 合法值為 `Open | in-progress | Done | Close`，支援 kebab-case alias（`in-progress` → `In Progress`）。非法值時輸出錯誤訊息 `無效的狀態值，合法值為：Open, in-progress, Done, Close`。
- `CLI-016`：`curl-ticket update-status` 成功時輸出 `已更新為 {status}`。
- `CLI-017`：`curl-ticket init-skill` — 將 Skill 檔案複製到當前目錄的 `.claude/skills/curl-ticket/SKILL.md`。
- `CLI-018`：`curl-ticket init-skill` 若目標檔案已存在，需提示是否覆蓋。

#### B3. 輸出格式（Context 優化）

本節定義 CLI stdout 的格式規範。設計原則是以**最少 token 數**傳達**對 LLM 分析最有用**的資訊。

##### 列表摘要格式（`issues` 指令）

- `CLI-019`：每筆 issue 摘要為一行，格式為 `#{friendlyId} [{status}] {method} {url} → {responseStatus} 「{title}」`。
- `CLI-020`：Task 類型的 method/url/responseStatus 以 `(Task)` 取代。
- `CLI-021`：每筆摘要目標 ≤ 40 tokens。20 筆列表總計目標 ≤ 800 tokens。

##### 詳情格式（`issue` 指令）

- `CLI-022`：輸出為結構化純文字（非 JSON），每行一個欄位，以 `key: value` 呈現。
- `CLI-023`：必輸出欄位：friendlyId、title、issueType、status。
- `CLI-024`：API Bug 條件欄位：method + url（合併為 `端點:`）、environment、responseStatus。
- `CLI-025`：`responseBody` 僅提取錯誤訊息（`message` / `error` / `statusMessage` 欄位），截斷至 300 字元。完整 responseBody 不輸出。
- `CLI-026`：`rawCurl` 輸出精簡版：移除 `user-agent`、`accept-language`、`cookie`、`sec-*`、`cache-control` 等非關鍵 header，截斷至 500 字元。
- `CLI-027`：`requestHeaders` 不輸出（避免洩漏 Token 等敏感資訊，且佔用 token 量大）。
- `CLI-028`：`description` 截斷至 300 字元。
- `CLI-029`：`createdAt`、`updatedAt`、`createdBy`、`requestBody` 不輸出（對 debug 價值低）。
- `CLI-030`：單筆詳情總計目標 ≤ 600 tokens。

##### Token 預算總表

| 指令 | 預估 Tokens | 控制方式 |
|------|-------------|----------|
| `projects` | ~200（10 專案） | 僅輸出 key / name / id |
| `issues`（10 筆） | ~400 | 每筆 ~40 tokens 摘要 |
| `issues`（20 筆） | ~800 | 同上 |
| `issue`（1 筆） | ~200-600 | 動態截斷，依欄位內容量 |
| `update-status` | ~10 | 僅確認訊息 |
| **典型工作流**（列表 + 2 筆詳情） | **~1,000-2,000** | |

#### B4. 錯誤處理

- `CLI-031`：API 回傳 401 時，輸出 `Token 無效或已過期，請至 Curl Ticket 站台重新產生。`。
- `CLI-032`：API 回傳 403 時，輸出 `無權限存取此專案。`。
- `CLI-033`：API 回傳 404 時，輸出 `找不到指定的 {resource}。`。
- `CLI-034`：網路錯誤時，輸出 `無法連線至 {CURL_TICKET_URL}，請確認網址與網路狀態。`。
- `CLI-035`：所有錯誤輸出至 stderr，以 exit code 1 結束。

#### B5. API Client

- `CLI-036`：CLI 內部封裝 `CurlTicketClient` class，統一處理 `Authorization: Bearer` header 與錯誤回應。
- `CLI-037`：API Client 呼叫既有的 Curl Ticket API endpoint，不需新增任何 CLI 專用 API。
- `CLI-038`：API Client 呼叫的 endpoint 清單：`GET /api/projects`、`GET /api/projects/:projectId/issues`、`GET /api/projects/:projectId/issues/:issueId`、`PATCH /api/projects/:projectId/issues/:issueId`。

### 技術規格

- `CLI-039`：TypeScript 開發，tsup 打包為 ESM。
- `CLI-040`：CLI framework 使用 `commander`。
- `CLI-041`：不依賴 `@modelcontextprotocol/sdk`（非 MCP Server）。
- `CLI-042`：`package.json` 的 `bin` 欄位指向 `./dist/index.js`。
- `CLI-043`：`package.json` 的 `files` 欄位包含 `dist` 與 `skills` 目錄。

### 專案結構

```
packages/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # CLI 進入點（commander setup）
│   ├── commands/
│   │   ├── projects.ts       # projects 子指令
│   │   ├── issues.ts         # issues 子指令
│   │   ├── issue.ts          # issue 子指令
│   │   ├── update-status.ts  # update-status 子指令
│   │   └── init-skill.ts     # init-skill 子指令
│   ├── api-client.ts         # CurlTicketClient（封裝 fetch + auth header）
│   └── formatters.ts         # JSON → 精簡純文字轉換
├── skills/
│   └── curl-ticket/
│       └── SKILL.md          # Claude Code Skill 檔案
└── README.md                 # 安裝與使用文件
```

---

## 模組 C：Claude Code Skill

### 功能需求

- `SKILL-001`：Skill 檔案路徑為 `.claude/skills/curl-ticket/SKILL.md`。
- `SKILL-002`：Skill 的 `name` 為 `curl-ticket-issue-analyzer`。
- `SKILL-003`：Skill 的 `description` 需涵蓋觸發關鍵字：issue、bug、ticket、錯誤、Curl Ticket、CT-（friendly ID 前綴）。
- `SKILL-004`：Skill 設定 `user-invocable: false`，僅由 Claude 自動觸發，使用者不手動呼叫。

#### C1. Skill 內容規範

- `SKILL-005`：SKILL.md body 需列出所有可用的 `curl-ticket` CLI 指令與選項。
- `SKILL-006`：SKILL.md body 需包含「分析流程」，指引 Claude 從 issue 資訊到本地 codebase 的追蹤路徑。
- `SKILL-007`：分析流程需包含 endpoint → 本地 route 檔案的對應規則（Nuxt file-based routing 慣例）。
- `SKILL-008`：分析流程需包含 responseStatus 的判斷邏輯（4xx → 驗證/權限、5xx → 程式錯誤）。
- `SKILL-009`：分析流程需指引 Claude 追蹤完整請求鏈：middleware → route handler → utils → DB query。
- `SKILL-010`：SKILL.md body 需包含「注意事項」，提醒 Claude 使用過濾參數縮小查詢範圍、一次只深入 1-2 筆 issue。
- `SKILL-011`：SKILL.md body 總行數不超過 60 行，控制觸發時的 token 消耗。

#### C2. 使用者端設定

- `SKILL-012`：使用者需在 `.claude/settings.json` 的 `permissions.allow` 中加入 `Bash(curl-ticket:*)`，允許 Claude 執行 CLI。
- `SKILL-013`：`curl-ticket init-skill` 執行時，若偵測到 `.claude/settings.json` 存在，提示使用者需手動加入權限設定。

---

## 使用者設定完整流程

### Step 1：在 Curl Ticket 站台產生 Token

進入「設定 → API Tokens → 新增」，輸入名稱，複製產生的 Token。

### Step 2：安裝 CLI 並設定環境變數

```bash
npm install -g @anthropic-ai/curl-ticket-cli

# 加入 shell 設定（.bashrc / .zshrc / .config/fish/config.fish）
export CURL_TICKET_URL="https://your-instance.vercel.app"
export CURL_TICKET_TOKEN="ct_xxxxxxxxxxxxxxxx"
```

### Step 3：在專案中初始化 Skill

```bash
cd /path/to/your-project
curl-ticket init-skill
```

此指令會建立 `.claude/skills/curl-ticket/SKILL.md`。

### Step 4：設定 Claude Code 權限

在 `.claude/settings.json`（或 `.claude/settings.local.json`）中加入：

```json
{
  "permissions": {
    "allow": [
      "Bash(curl-ticket:*)"
    ]
  }
}
```

### Step 5：使用

```
> 看一下目前有什麼 open 的 issue
> CT-42 那個 500 幫我查一下
> 修好了，把 issue 標成 Done
```

---

## 實作指引

### Auth Middleware 修改範圍

修改 `server/middleware/auth.ts`，在現有 Supabase session 檢查**之前**插入 Bearer Token 路徑。流程分支：

```
收到 /api/* 請求
  ├── 在 publicRoutes 中？ → 放行
  ├── Authorization header 為 Bearer ct_* ？
  │   ├── hash 比對 api_tokens → 成功 → 設定 context，放行
  │   └── 失敗 → 401
  └── 既有 Supabase session 驗證（不變）
```

### Formatter 實作要點

`formatters.ts` 為 CLI 輸出格式的核心邏輯，需實作以下函式：

| 函式 | 用途 | 輸入 | 輸出 |
|------|------|------|------|
| `formatIssueSummary(issue, friendlyId)` | 列表摘要 | Issue 物件 | 單行字串 |
| `formatIssueDetail(issue, friendlyId)` | 完整詳情 | Issue 物件 | 多行字串 |
| `extractErrorMessage(responseBody)` | 從 response 提取錯誤訊息 | unknown | string / null |
| `simplifyCurl(rawCurl)` | 精簡 cURL | string | string |
| `truncate(str, maxLength)` | 截斷長字串 | string, number | string |

`simplifyCurl` 需移除的 header pattern：

- `user-agent`
- `accept-language`
- `cookie`
- `sec-*`（所有以 sec- 開頭的 header）
- `cache-control`

比對方式為 case-insensitive，同時處理單引號和雙引號兩種 cURL header 格式。

### Friendly ID 解析

`CLI-013` 要求支援 friendly ID 輸入。解析邏輯：

- 若 `issueId` 符合 `/^\d+$/`，視為數字 ID，直接傳入 API（作為 `issueId`）。
- 若 `issueId` 符合 `/^[A-Z]+-\d+$/i`，取 `-` 後的數字部分。此數字為 `issueNumber`（專案內流水號），非內部 `issues.id`。
- 其他格式，輸出錯誤。

**issueNumber 查詢需求：**

- `CLI-045`：當 CLI 解析出 friendly ID 時，API Client 需以 `issueNumber` + `projectId` 查詢 issue，而非直接以數字作為 `issueId`。
- `CLI-046`：issue detail（`GET /api/projects/:projectId/issues`）與 update（`PATCH`）endpoint 需支援以 `issueNumber` query param 查詢（`?issueNumber=42`）。`(projectId, issueNumber)` 已有 unique index，可確保唯一性。
- `CLI-038` 補充：API Client 呼叫 endpoint 清單新增 `GET /api/projects/:projectId/issues?issueNumber=N`（以 issueNumber 查詢單筆）。

---

## Cross-References

- 認證架構：見 [auth.md](./auth.md) 的 `AUTH-008`（Supabase session）、`AUTH-021`（角色）。
- Project Access 規則：見 [projects.md](./projects.md) 的 `PROJ-001`（owner / member 權限）。
- Issue 資料欄位：見 [data-model.md](./data-model.md) 的 `DATA-006`、`DATA-007`。
- Issue API endpoint：見 [issues.md](./issues.md) 的 `ISSUE-001` ~ `ISSUE-043`。
- 敏感欄位遮罩：見 [non-functional.md](./non-functional.md) 的 `NFR-008`。
- 此功能應加入 Roadmap 為新 Phase，見 [roadmap.md](./roadmap.md)。
- 資料模型變更（`api_tokens` 表）需同步更新 [data-model.md](./data-model.md)。
