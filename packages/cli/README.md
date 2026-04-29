# @curl-ticket/cli

[English](#english) | [繁體中文](#繁體中文)

---

## English

CLI tool for [Curl Ticket](https://github.com/WOOWOOYONG/Curl-Ticket) — query issues and update status from your terminal.

> **Tip:** All commands support the short alias `ct` — e.g. `ct projects` instead of `curl-ticket projects`.

### Install

> [!TIP]
> **npm**
>
> ```bash
> npm install -g @curl-ticket/cli
> ```

> [!TIP]
> **pnpm**
>
> ```bash
> pnpm add -g @curl-ticket/cli
> ```

### Quick Start

Run any command to start the interactive setup:

```bash
ct projects
```

On first run, you'll be prompted to enter your Curl Ticket instance URL, then a browser window will open for authentication. Your credentials are saved locally at `~/.config/curl-ticket/config.json`.

For local development and manual QA, see [TESTING.md](./TESTING.md).

### Commands

#### Projects

```bash
# List all accessible projects
ct projects

# View project details
ct project <projectId>

# Create a new project
ct create-project --name "My Project" --key "MP" --description "optional"

# List project members
ct members <projectId>
```

#### Issues

```bash
# List issues for a project
ct issues <projectId>

# Filter by status and type
ct issues <projectId> -s Open -t api_bug -n 10

# Filter by assignee
ct issues <projectId> --assignee me
ct issues <projectId> --assignee <uuid|email|none>

# Get issue details (by ID or friendly ID like CT-42)
ct issue <projectId> <issueId>
ct issue <projectId> CT-42

# Update issue status
ct update-status <projectId> <issueId> Open
ct update-status <projectId> <issueId> in-progress
ct update-status <projectId> <issueId> Done
ct update-status <projectId> <issueId> Close

# Delete an issue (with confirmation prompt)
ct delete-issue <projectId> <issueId>

# Delete without confirmation
ct delete-issue <projectId> <issueId> --force
```

#### Create Issue

```bash
# Interactive mode — guided prompts with arrow-key selection
ct create-issue <projectId>

# API Bug from cURL (non-interactive)
ct create-issue <projectId> --type api_bug --curl "curl https://api.example.com/users"

# Task with title and Markdown description (non-interactive)
ct create-issue <projectId> --type task --title "Add rate limiting" --description "## Why\nToo many requests"

# Guided 5-step task flow (project / title / why / acceptance criteria / assignee)
ct create-issue --type task --interactive
ct create-issue <projectId> --type task --interactive --title "Pre-fill works too"

# Print a description template to stdout (no API call)
ct create-issue --type task --from-template task

# Use a template as the starting point in interactive mode
ct create-issue <projectId> --type task --interactive --from-template task

# With environment and status options
ct create-issue <projectId> --type api_bug --curl "..." --env Staging --status in-progress

# Assign to self on creation
ct create-issue <projectId> --type task --title "Add rate limiting" --assignee me
```

In interactive mode, cURL commands and descriptions are edited in your `$EDITOR` (default: vim), supporting multiline Markdown input. `--interactive` and `--json` are mutually exclusive; `--from-template` and `--description` are mutually exclusive; `--interactive` is currently only supported with `--type task`.

#### Assign

```bash
# Assign issue to a member (me / none / <uuid> / <email>)
ct assign <projectId> <issueId> me
ct assign <projectId> <issueId> user@example.com
ct assign <projectId> <issueId> <uuid>

# Unassign
ct assign <projectId> <issueId> none

# Preview without applying
ct assign <projectId> <issueId> me --dry-run
```

#### My Issues

```bash
# List all issues assigned to you (across all projects)
ct my-issues

# Filter by status (repeatable)
ct my-issues -s Open
ct my-issues -s Open -s "In Progress"

# Filter by project or environment
ct my-issues --project <projectId>
ct my-issues --environment Staging

# Pagination and sort
ct my-issues --sort updatedAt --order asc --page 2
```

The response includes a `summary` block with counts per status (open, inProgress, done, close, total).

#### Comments

```bash
# List comments on an issue
ct comments <projectId> <issueId>

# Get a single comment
ct comment <projectId> <issueId> <commentId>

# Add a comment
ct add-comment <projectId> <issueId> "investigation complete, root cause is..."

# Edit a comment
ct edit-comment <projectId> <issueId> <commentId> "updated content"

# Delete a comment (with confirmation prompt)
ct delete-comment <projectId> <issueId> <commentId>

# Delete without confirmation
ct delete-comment <projectId> <issueId> <commentId> --force
```

#### JSON Output

All data commands support `--json` for structured output, useful for scripts and AI agent integration:

```bash
ct projects --json
ct issues <projectId> --json
ct issue <projectId> CT-42 --json
ct issue <projectId> CT-42 --json --fields status,method,url   # Fetch specific fields only
ct update-status <projectId> <issueId> Done --json
ct update-status <projectId> <issueId> Done --json --dry-run   # Preview without applying
```

JSON responses include full API data and pagination metadata. Errors also return structured JSON (with `exitCode` field) when this flag is used.

#### Schema Introspection

```bash
# Print full CLI schema (commands, args, options, enums, exit codes, fields)
ct schema
```

No authentication required. Useful for AI agents to discover available commands and valid values.

#### Exit Codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| 0    | Success                                        |
| 1    | General error                                  |
| 2    | Authentication / authorization error (401/403) |
| 3    | Resource not found (404)                       |
| 4    | Validation error (invalid input)               |
| 5    | Network connection error                       |

#### Authentication

```bash
# Login (with explicit URL)
ct auth login --url https://your-instance.example.com

# Check login status
ct auth status

# Logout
ct auth logout
```

#### Claude Code Integration

This CLI ships with two [Claude Code Skills](https://docs.anthropic.com/en/docs/claude-code):

| Skill                        | Use case                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `curl-ticket-issue-analyzer` | Query and analyze existing issues, locate problematic code in the local codebase, suggest fixes, update status. |
| `curl-ticket-create-task`    | Guided interactive creation of a Task (project / title / why / acceptance criteria / assignee).                 |

```bash
# Install one or more skills into your project
ct init-skill
```

`init-skill` is interactive — pick which skills to install (default: all) and which agents to target (Claude Code / Codex / GitHub Copilot / custom path). Existing files are never overwritten without confirmation.

After setup, mention any issue (e.g. "look at CT-42") in Claude Code and the analyzer skill will fetch the issue and help locate the relevant code; say "create a task for …" and the create-task skill will guide you through filing it.

### Configuration

Authentication can be configured in two ways:

1. **Interactive login** (recommended): Run any command and follow the prompts
2. **Environment variables**: Set `CURL_TICKET_URL` and `CURL_TICKET_TOKEN`

| Variable              | Description                            |
| --------------------- | -------------------------------------- |
| `CURL_TICKET_URL`     | Instance URL                           |
| `CURL_TICKET_TOKEN`   | Auth token                             |
| `CURL_TICKET_TIMEOUT` | Request timeout in ms (default: 30000) |

### Requirements

- Node.js >= 20
- A running Curl Ticket instance

---

## 繁體中文

[Curl Ticket](https://github.com/WOOWOOYONG/Curl-Ticket) 的 CLI 工具 — 直接在終端機查詢 issue 並更新狀態。

> **提示：** 所有指令都支援短指令 `ct` — 例如用 `ct projects` 取代 `curl-ticket projects`。

### 安裝

> [!TIP]
> **npm**
>
> ```bash
> npm install -g @curl-ticket/cli
> ```

> [!TIP]
> **pnpm**
>
> ```bash
> pnpm add -g @curl-ticket/cli
> ```

### 快速開始

執行任何指令即可啟動互動式設定：

```bash
ct projects
```

首次執行時，系統會提示你輸入 Curl Ticket 站台網址，接著開啟瀏覽器進行登入驗證。登入資訊會儲存在 `~/.config/curl-ticket/config.json`。

若要進行本地開發與手動測試，請參考 [TESTING.md](./TESTING.md)。

### 指令

#### 專案相關

```bash
# 列出所有可存取的專案
ct projects

# 查看專案詳情
ct project <projectId>

# 建立新專案
ct create-project --name "My Project" --key "MP" --description "選填"

# 列出專案成員
ct members <projectId>
```

#### Issue 相關

```bash
# 列出專案的 issue
ct issues <projectId>

# 依狀態和類型過濾
ct issues <projectId> -s Open -t api_bug -n 10

# 依指派對象過濾
ct issues <projectId> --assignee me
ct issues <projectId> --assignee <uuid|email|none>

# 取得 issue 詳情（支援 ID 或編號如 CT-42）
ct issue <projectId> <issueId>
ct issue <projectId> CT-42

# 更新 issue 狀態
ct update-status <projectId> <issueId> Open
ct update-status <projectId> <issueId> in-progress
ct update-status <projectId> <issueId> Done
ct update-status <projectId> <issueId> Close

# 刪除 issue（會顯示確認提示）
ct delete-issue <projectId> <issueId>

# 刪除 issue（跳過確認）
ct delete-issue <projectId> <issueId> --force
```

#### 建立 Issue

```bash
# 互動模式 — 方向鍵選擇，引導式操作
ct create-issue <projectId>

# 從 cURL 建立 API Bug（非互動模式）
ct create-issue <projectId> --type api_bug --curl "curl https://api.example.com/users"

# 建立 Task，附帶 Markdown 描述（非互動模式）
ct create-issue <projectId> --type task --title "加入 Rate Limiting" --description "## Why\n請求過多"

# 引導式 5 步 Task 流程（project / title / why / acceptance criteria / assignee）
ct create-issue --type task --interactive

# 印出描述樣板到 stdout，不呼叫 API
ct create-issue --type task --from-template task

# 互動模式下使用樣板作為預設值
ct create-issue <projectId> --type task --interactive --from-template task

# 指定環境與狀態
ct create-issue <projectId> --type api_bug --curl "..." --env Staging --status in-progress

# 建立時同時指派給自己
ct create-issue <projectId> --type task --title "加入 Rate Limiting" --assignee me
```

互動模式下，cURL 指令和描述會在 `$EDITOR`（預設 vim）中編輯，支援多行 Markdown 輸入。`--interactive` 與 `--json` 互斥；`--from-template` 與 `--description` 互斥；`--interactive` 目前僅支援 `--type task`。

#### 指派 Issue

```bash
# 指派給成員（me / none / <uuid> / <email>）
ct assign <projectId> <issueId> me
ct assign <projectId> <issueId> user@example.com
ct assign <projectId> <issueId> <uuid>

# 取消指派
ct assign <projectId> <issueId> none

# 預覽變更，不實際執行
ct assign <projectId> <issueId> me --dry-run
```

#### 我的 Issue

```bash
# 列出指派給你的所有 issue（跨所有專案）
ct my-issues

# 依狀態過濾（可重複使用）
ct my-issues -s Open
ct my-issues -s Open -s "In Progress"

# 依專案或環境過濾
ct my-issues --project <projectId>
ct my-issues --environment Staging

# 分頁與排序
ct my-issues --sort updatedAt --order asc --page 2
```

回應包含 `summary` 區塊，顯示各狀態的 issue 數量（open、inProgress、done、close、total）。

#### Comment 相關

```bash
# 列出 issue 的留言
ct comments <projectId> <issueId>

# 取得單一留言
ct comment <projectId> <issueId> <commentId>

# 新增留言
ct add-comment <projectId> <issueId> "調查完成，根本原因是..."

# 編輯留言
ct edit-comment <projectId> <issueId> <commentId> "更新後的內容"

# 刪除留言（會顯示確認提示）
ct delete-comment <projectId> <issueId> <commentId>

# 刪除留言（跳過確認）
ct delete-comment <projectId> <issueId> <commentId> --force
```

#### JSON 輸出

所有資料指令皆支援 `--json`，輸出結構化 JSON，適合腳本與 AI Agent 整合使用：

```bash
ct projects --json
ct issues <projectId> --json
ct issue <projectId> CT-42 --json
ct issue <projectId> CT-42 --json --fields status,method,url   # 僅取得指定欄位
ct update-status <projectId> <issueId> Done --json
ct update-status <projectId> <issueId> Done --json --dry-run   # 預覽變更，不實際執行
```

JSON 回應包含完整 API 資料與分頁資訊。啟用此 flag 時，錯誤也會以結構化 JSON（含 `exitCode` 欄位）回傳。

#### Schema 自我描述

```bash
# 輸出完整 CLI schema（指令、參數、選項、enum 值、exit code、可用欄位）
ct schema
```

不需認證。適合 AI Agent 在首次呼叫時探索可用操作與合法值。

#### Exit Code

| 代碼 | 意義                      |
| ---- | ------------------------- |
| 0    | 成功                      |
| 1    | 一般錯誤                  |
| 2    | 認證 / 授權錯誤 (401/403) |
| 3    | 資源不存在 (404)          |
| 4    | 輸入驗證錯誤              |
| 5    | 網路連線錯誤              |

#### 認證

```bash
# 登入（手動指定網址）
ct auth login --url https://your-instance.example.com

# 查看登入狀態
ct auth status

# 登出
ct auth logout
```

#### Claude Code 整合

此 CLI 內建兩支 [Claude Code Skill](https://docs.anthropic.com/en/docs/claude-code)：

| Skill                        | 用途                                                                      |
| ---------------------------- | ------------------------------------------------------------------------- |
| `curl-ticket-issue-analyzer` | 查詢 / 分析既有 issue、定位本地程式碼、提供修復建議、更新狀態             |
| `curl-ticket-create-task`    | 引導式建立 Task（project / title / why / acceptance criteria / assignee） |

```bash
# 在專案中安裝 Skill
ct init-skill
```

`init-skill` 會以互動方式詢問要安裝哪些 skill（預設全選）與目標 agent（Claude Code / Codex / GitHub Copilot / 自訂路徑）。已存在的檔案不會在未確認下被覆寫。

安裝後，在 Claude Code 提到任何 issue（如「幫我看 CT-42」）會啟動 analyzer；說「幫我建一張 task …」則由 create-task skill 引導你逐步建立。

### 設定方式

認證支援兩種方式：

1. **互動式登入**（推薦）：執行任何指令，依提示操作即可
2. **環境變數**：設定 `CURL_TICKET_URL` 和 `CURL_TICKET_TOKEN`

| 變數                  | 說明                         |
| --------------------- | ---------------------------- |
| `CURL_TICKET_URL`     | 站台網址                     |
| `CURL_TICKET_TOKEN`   | 認證 Token                   |
| `CURL_TICKET_TIMEOUT` | 請求逾時（毫秒，預設 30000） |

### 系統需求

- Node.js >= 20
- 一個已部署的 Curl Ticket 站台

---

## License

MIT
