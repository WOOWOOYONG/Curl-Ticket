# CLI 工具（`curl-ticket-cli`）

## 範圍

本文件涵蓋 CLI 套件的指令定義、自動登入機制、輸出格式規範（Context 優化）、API Client、錯誤處理。

---

## B1. 套件基本資訊

- `CLI-001`：npm 套件名稱為 `@anthropic-ai/curl-ticket-cli`（暫定，視發佈帳號調整）。
- `CLI-002`：安裝後提供全域指令 `curl-ticket`。
- `CLI-003`：TypeScript 開發，tsup 打包為 ESM。
- `CLI-004`：CLI framework 使用 `commander`。
- `CLI-005`：不依賴 `@modelcontextprotocol/sdk`（非 MCP Server）。
- `CLI-006`：`package.json` 的 `bin` 欄位指向 `./dist/index.js`。
- `CLI-007`：`package.json` 的 `files` 欄位包含 `dist` 與 `skills` 目錄。

### 專案結構

```
packages/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                # CLI 進入點（commander setup + ensureAuth）
│   ├── commands/
│   │   ├── projects.ts         # projects 子指令
│   │   ├── issues.ts           # issues 子指令
│   │   ├── issue.ts            # issue 子指令
│   │   ├── update-status.ts    # update-status 子指令
│   │   ├── schema.ts           # schema 子指令（Agent introspection）
│   │   ├── auth.ts             # auth login / status / logout 子指令
│   │   └── init-skill.ts       # init-skill 子指令
│   ├── auth/
│   │   ├── config.ts           # 本地 config 讀寫（~/.config/curl-ticket/config.json）
│   │   └── device-flow.ts      # Device Code Flow 實作
│   ├── api-client.ts           # CurlTicketClient（封裝 fetch + auth header）
│   ├── utils.ts                # ValidationError、normalizeStatus、normalizeType、validateProjectId、parseIssueId
│   ├── constants.ts            # ExitCode、ISSUE_FIELDS、CLI 設定常數
│   └── formatters.ts           # JSON → 精簡純文字轉換
├── skills/
│   └── curl-ticket/
│       └── SKILL.md            # Claude Code Skill 檔案
└── README.md
```

---

## B2. 設定與驗證

### 設定來源

- `CLI-008`：CLI 從以下來源讀取設定，優先順序由高到低：環境變數 `CURL_TICKET_URL` + `CURL_TICKET_TOKEN` → 本地 config 檔 `~/.config/curl-ticket/config.json`。
- `CLI-009`：環境變數存在時直接使用，不觸發 Device Code Flow。此模式供 CI/CD 或進階使用者使用。
- `CLI-010`：本地 config 檔格式為 JSON：`{ "url": "https://...", "token": "ct_xxx" }`。
- `CLI-011`：config 檔案權限需設為 `600`（僅擁有者可讀寫）。

### 自動登入（ensureAuth）

- `CLI-012`：所有資料查詢指令（`projects`、`issues`、`issue`、`update-status`）在執行前需呼叫 `ensureAuth()`。
- `CLI-013`：`ensureAuth()` 檢查順序：環境變數 → config 檔 → 都沒有則自動啟動 Device Code Flow。
- `CLI-014`：Device Code Flow 完成後，`ensureAuth()` 自動接續執行使用者原本的指令，不需重新輸入。
- `CLI-015`：API 回傳 `401` 時，視為 Token 失效，自動觸發 Device Code Flow 重新登入，再重試原指令一次。
- `CLI-016`：`ensureAuth()` 需要知道站台 URL。讀取順序：環境變數 `CURL_TICKET_URL` → config 檔的 `url` 欄位 → 都沒有則提示使用者以 `--url` 參數指定或執行 `curl-ticket auth login --url <URL>`。

### Device Code Flow（CLI 端）

- `CLI-017`：`ensureAuth()` 啟動 Device Code Flow 時，POST 站台 `/api/auth/device/code` 取得 `deviceCode`、`userCode`、`verificationUrl`。
- `CLI-018`：將驗證網址與 user code 輸出至 stderr（格式見下方）。
- `CLI-019`：嘗試以 `open`（macOS）/ `xdg-open`（Linux）/ `start`（Windows）開啟瀏覽器。失敗時靜默忽略（使用者可手動開啟）。
- `CLI-020`：以 `interval` 秒為間隔 polling `/api/auth/device/token`，直到收到 `complete`（取得 Token）或 `expired`（逾時）。
- `CLI-021`：polling 期間在 stderr 顯示等待動畫或倒數提示。
- `CLI-022`：收到 Token 後，儲存 `{ url, token }` 至 `~/.config/curl-ticket/config.json`。
- `CLI-023`：儲存成功後在 stderr 印出 `✓ 登入成功`。

#### stderr 輸出格式

```
尚未登入 Curl Ticket

  請在瀏覽器開啟：https://curl-ticket.app/auth/device
  並輸入代碼：ABCD-EFGH

  等待驗證中... (剩餘 267 秒)

✓ 登入成功
```

### stdout / stderr 分離

- `CLI-024`：所有 auth 相關訊息（登入提示、等待動畫、成功/失敗訊息）寫入 stderr。指令的正常資料結果寫入 stdout。Claude Code 讀取 stdout 作為 tool result，stderr 的 auth 訊息不會混入分析資料。

---

## B3. Auth 管理指令

- `CLI-025`：`curl-ticket auth login --url <URL>` — 手動啟動 Device Code Flow。供首次設定或切換帳號使用。
- `CLI-026`：`curl-ticket auth status` — 顯示當前登入狀態：config 來源（環境變數 / config 檔）、站台 URL、Token prefix、到期時間。不顯示完整 Token。
- `CLI-027`：`curl-ticket auth logout` — 刪除本地 config 檔。不主動撤銷站台 Token（使用者可至站台 UI 撤銷）。

---

## B4. 資料查詢指令

### projects

- `CLI-028`：`curl-ticket projects` — 列出使用者可存取的所有專案。
- `CLI-029`：每筆輸出格式為 `{key}\t{name}\t({id})`，每行一筆。

### issues

- `CLI-030`：`curl-ticket issues <projectId>` — 列出指定專案的 issue 摘要。
- `CLI-031`：支援選項 `--status, -s`（過濾：Open / In Progress / Done / Close）。
- `CLI-032`：支援選項 `--type, -t`（過濾：api_bug / task）。
- `CLI-033`：支援選項 `--limit, -n`（筆數上限，預設 10，最大 20）。
- `CLI-034`：每筆輸出摘要格式，見「輸出格式」章節。

### issue

- `CLI-035`：`curl-ticket issue <projectId> <issueId>` — 取得單一 issue 詳情。
- `CLI-036`：`<issueId>` 接受數字 ID 或 friendly ID（如 `CT-42`）。
- `CLI-037`：Friendly ID 解析：符合 `/^\d+$/` 視為數字 ID；符合 `/^[A-Z]+-\d+$/i` 取 `-` 後的數字部分；其他格式輸出錯誤。
- `CLI-038`：輸出完整詳情的精簡格式，見「輸出格式」章節。

### update-status

- `CLI-039`：`curl-ticket update-status <projectId> <issueId> <status>` — 更新 issue 狀態。
- `CLI-040`：`<status>` 接受值：Open / In Progress / Done / Close（case-insensitive）。
- `CLI-041`：成功時輸出 `已更新為 {status}`。

### init-skill

- `CLI-042`：`curl-ticket init-skill` — 將 Skill 檔案複製到 `.claude/skills/curl-ticket/SKILL.md`。
- `CLI-043`：若目標檔案已存在，提示是否覆蓋。
- `CLI-044`：複製完成後提示使用者需在 `.claude/settings.json` 的 `permissions.allow` 中加入 `Bash(curl-ticket:*)`。

---

## B5. 輸出格式

### 雙模式輸出

- `CLI-064`：所有資料指令（`projects`、`issues`、`issue`、`update-status`）支援 `--json` global flag。
- `CLI-065`：`--json` 為 Commander.js root program 上的 option，透過 `program.opts()` 讀取，傳入各 command handler。
- `CLI-066`：`--json` 模式下，stdout 輸出原始 API JSON（`JSON.stringify(res, null, 2)`），包含完整資料與 pagination metadata。
- `CLI-067`：`--json` 模式下，所有訊息性文字（auth 提示、進度提示）僅走 stderr，stdout 保持純 JSON。
- `CLI-068`：未指定 `--json` 時，行為與原 human-readable 模式完全一致（向後相容）。

#### JSON 模式輸出格式

列表指令（`projects`、`issues`）：

```json
{
  "data": [...],
  "pagination": { "page": 1, "pageSize": 10, "total": 42, "totalPages": 5 }
}
```

單筆指令（`issue`、`update-status`）：

```json
{
  "data": { "id": 1, "issueNumber": 42, "status": "Open", ... },
  "friendlyId": "CT-42"
}
```

錯誤（`--json` 模式）：

```json
{
  "error": true,
  "code": 404,
  "exitCode": 3,
  "message": "Resource not found."
}
```

### Human-Readable 模式

設計原則：以**最少 token 數**傳達**對 LLM 分析程式碼最有用**的資訊。純文字格式。

### 列表摘要格式（`issues` 指令）

- `CLI-045`：每筆 issue 摘要為一行，格式：`#{friendlyId} [{status}] {method} {url} → {responseStatus} 「{title}」`。
- `CLI-046`：Task 類型的 method/url/responseStatus 以 `(Task)` 取代。
- `CLI-047`：每筆摘要目標 ≤ 40 tokens。20 筆列表總計目標 ≤ 800 tokens。

範例輸出：

```
#CT-42 [Open] POST /api/users → 500 「建立使用者時 email 欄位 null error」
#CT-41 [Open] GET /api/projects/abc/issues → 200 「Issue 列表回應過慢」
#CT-40 [In Progress] (Task) 「重構 auth middleware」
#CT-39 [Done] DELETE /api/tokens/xyz → 403 「撤銷 Token 權限錯誤」
```

### 詳情格式（`issue` 指令）

- `CLI-048`：輸出為結構化純文字，每行一個欄位，以 `key: value` 呈現。
- `CLI-049`：必輸出欄位：friendlyId、title、issueType、status。
- `CLI-050`：API Bug 條件欄位：method + url（合併為 `端點:`）、environment、responseStatus。
- `CLI-051`：`responseBody` 僅提取錯誤訊息（`message` / `error` / `statusMessage` 欄位），截斷至 300 字元。完整 responseBody 不輸出。
- `CLI-052`：`rawCurl` 輸出精簡版：移除非關鍵 header（見 Formatter 章節），截斷至 500 字元。
- `CLI-053`：`requestHeaders` 不輸出（避免洩漏敏感資訊，且佔用 token 量大）。
- `CLI-054`：`description` 截斷至 300 字元。
- `CLI-055`：`createdAt`、`updatedAt`、`createdBy`、`requestBody` 不輸出（對 debug 價值低）。
- `CLI-056`：單筆詳情總計目標 ≤ 600 tokens。

範例輸出：

```
# CT-42: 建立使用者時 email 欄位 null error
類型: API Bug
狀態: Open
端點: POST /api/users
環境: Dev
回應狀態碼: 500
錯誤訊息: column "email" cannot be null
cURL: curl -X POST https://example.com/api/users -H 'Content-Type: application/json' -H 'Authorization: Bearer ***' -d '{"name":"test"}'
```

### Token 預算總表（Human-Readable 模式）

| 指令 | 預估 Tokens | 控制方式 |
|------|-------------|----------|
| `projects` | ~200（10 專案） | 僅輸出 key / name / id |
| `issues`（10 筆） | ~400 | 每筆 ~40 tokens 摘要 |
| `issues`（20 筆） | ~800 | 同上 |
| `issue`（1 筆） | ~200-600 | 動態截斷，依欄位內容量 |
| `update-status` | ~10 | 僅確認訊息 |
| **典型工作流**（列表 + 2 筆詳情） | **~1,000-2,000** | |

### Token 預算備註（JSON 模式）

`--json` 模式輸出完整 API 資料（含所有欄位、pagination），token 量會高於 human-readable 模式（約 2-5 倍），但 Agent 可直接 parse 結構化資料，無轉譯損失。未來可搭配 `--fields` field mask（見 [README.md Phase E3](./README.md)）控制輸出欄位以降低 token 開銷。

---

## B6. Formatter 實作

`formatters.ts` 為 CLI 輸出格式的核心邏輯。

### 必要函式

| 函式 | 用途 | 輸入 | 輸出 |
|------|------|------|------|
| `formatIssueSummary(issue, friendlyId)` | 列表摘要 | Issue 物件 | 單行字串 |
| `formatIssueDetail(issue, friendlyId)` | 完整詳情 | Issue 物件 | 多行字串 |
| `extractErrorMessage(responseBody)` | 從 response 提取錯誤訊息 | unknown | string \| null |
| `simplifyCurl(rawCurl)` | 精簡 cURL | string | string |
| `truncate(str, maxLength)` | 截斷長字串 | string, number | string |

### simplifyCurl 需移除的 header

以下 header 對 debug 無幫助且佔用大量 token，需從 rawCurl 中移除（case-insensitive，同時處理單引號和雙引號格式）：

- `user-agent`
- `accept-language`
- `accept-encoding`
- `cookie`
- `sec-*`（所有以 sec- 開頭的 header）
- `cache-control`
- `connection`
- `upgrade-insecure-requests`

### extractErrorMessage 解析順序

```
輸入 responseBody (unknown)
  ├── null/undefined → return null
  ├── string → 嘗試 JSON.parse
  │   ├── 成功 → 進入 object 分支
  │   └── 失敗 → truncate(原字串, 200)
  └── object → 依序嘗試取得：
      obj.message → obj.error → obj.statusMessage → obj.data?.message
      → 都沒有 → truncate(JSON.stringify(obj), 200)
```

---

## B7. API Client

- `CLI-057`：CLI 內部封裝 `CurlTicketClient` class，統一處理 `Authorization: Bearer` header、回應解析、錯誤處理。
- `CLI-058`：API Client 呼叫既有的 Curl Ticket API endpoint，不需新增任何 CLI 專用 API（Device Code API 除外）。

### 呼叫的 endpoint 清單

| CLI 指令 | API Endpoint |
|----------|-------------|
| `projects` | `GET /api/projects` |
| `issues` | `GET /api/projects/:projectId/issues` |
| `issue` | `GET /api/projects/:projectId/issues/:issueId` |
| `update-status` | `PATCH /api/projects/:projectId/issues/:issueId` |
| `auth login`（Device Code） | `POST /api/auth/device/code` + `POST /api/auth/device/token` |

---

## B8. 錯誤處理

- `CLI-059`：API 回傳 `401` 時，先觸發自動重新登入（`CLI-015`），重新登入後重試一次。若仍然 `401`，輸出 `Token 無效，請至 Curl Ticket 站台重新產生。`。
- `CLI-060`：API 回傳 `403` 時，輸出 `無權限存取此專案。`。
- `CLI-061`：API 回傳 `404` 時，輸出 `找不到指定的 {resource}。`。
- `CLI-062`：網路錯誤（fetch 失敗）時，輸出 `無法連線至 {URL}，請確認網址與網路狀態。`。
- `CLI-063`：所有錯誤訊息輸出至 stderr。正常結果輸出至 stdout，以 exit code 0 結束。錯誤使用語義化 exit code：`0`=成功, `1`=一般錯誤, `2`=認證錯誤(401/403), `3`=資源不存在(404), `4`=輸入驗證錯誤（見 `CLI-079`、`CLI-080`）。
- `CLI-069`：`--json` 模式下，`handleError` 統一提取 error code 與 message，輸出結構化 JSON（含 `exitCode` 欄位）至 stderr（避免 pipe 下游收到非預期結構），並以對應的語義化 exit code 結束。非 `--json` 模式行為不變。

---

## Cross-References

- Token 驗證機制：見 [api-tokens.md](./api-tokens.md) `TOKEN-008` ~ `TOKEN-013`
- Device Code Flow API：見 [api-tokens.md](./api-tokens.md) `TOKEN-026` ~ `TOKEN-031`
- Skill 如何引用 CLI 指令：見 [skill.md](./skill.md) `SKILL-005`
- Issue 資料欄位定義：見 [data-model.md](../data-model.md) `DATA-006`
- Issue 狀態常數：見 `shared/constants.ts` 的 `IssueStatus`
