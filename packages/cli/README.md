# @curl-ticket/cli

[English](#english) | [繁體中文](#繁體中文)

---

## English

CLI tool for [Curl Ticket](https://github.com/WOOWOOYONG/Curl-Ticket) — query issues and update status from your terminal.

> **Tip:** All commands support the short alias `ct` — e.g. `ct projects` instead of `curl-ticket projects`.

### Install

```bash
npm install -g @curl-ticket/cli
# or
pnpm add -g @curl-ticket/cli
```

### Quick Start

Run any command to start the interactive setup:

```bash
ct projects
```

On first run, you'll be prompted to enter your Curl Ticket instance URL, then a browser window will open for authentication. Your credentials are saved locally at `~/.config/curl-ticket/config.json`.

### Commands

#### Issues

```bash
# List all accessible projects
ct projects

# List issues for a project
ct issues <projectId>

# Filter by status and type
ct issues <projectId> -s Open -t api_bug -n 10

# Get issue details (by ID or friendly ID like CT-42)
ct issue <projectId> <issueId>
ct issue <projectId> CT-42

# Update issue status
ct update-status <projectId> <issueId> Open
ct update-status <projectId> <issueId> in-progress
ct update-status <projectId> <issueId> Done
ct update-status <projectId> <issueId> Close
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

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Authentication / authorization error (401/403) |
| 3 | Resource not found (404) |
| 4 | Validation error (invalid input) |

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

This CLI ships with a [Claude Code Skill](https://docs.anthropic.com/en/docs/claude-code) that lets Claude automatically query and analyze issues from your codebase.

```bash
# Install the skill into your project
ct init-skill
```

After setup, mention any issue (e.g. "look at CT-42") in Claude Code, and it will automatically fetch the issue details and help locate the relevant code.

### Configuration

Authentication can be configured in two ways:

1. **Interactive login** (recommended): Run any command and follow the prompts
2. **Environment variables**: Set `CURL_TICKET_URL` and `CURL_TICKET_TOKEN`

### Requirements

- Node.js >= 20
- A running Curl Ticket instance

---

## 繁體中文

[Curl Ticket](https://github.com/WOOWOOYONG/Curl-Ticket) 的 CLI 工具 — 直接在終端機查詢 issue 並更新狀態。

> **提示：** 所有指令都支援短指令 `ct` — 例如用 `ct projects` 取代 `curl-ticket projects`。

### 安裝

```bash
npm install -g @curl-ticket/cli
# 或
pnpm add -g @curl-ticket/cli
```

### 快速開始

執行任何指令即可啟動互動式設定：

```bash
ct projects
```

首次執行時，系統會提示你輸入 Curl Ticket 站台網址，接著開啟瀏覽器進行登入驗證。登入資訊會儲存在 `~/.config/curl-ticket/config.json`。

### 指令

#### Issue 相關

```bash
# 列出所有可存取的專案
ct projects

# 列出專案的 issue
ct issues <projectId>

# 依狀態和類型過濾
ct issues <projectId> -s Open -t api_bug -n 10

# 取得 issue 詳情（支援 ID 或編號如 CT-42）
ct issue <projectId> <issueId>
ct issue <projectId> CT-42

# 更新 issue 狀態
ct update-status <projectId> <issueId> Open
ct update-status <projectId> <issueId> in-progress
ct update-status <projectId> <issueId> Done
ct update-status <projectId> <issueId> Close
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

| 代碼 | 意義 |
|------|------|
| 0 | 成功 |
| 1 | 一般錯誤 |
| 2 | 認證 / 授權錯誤 (401/403) |
| 3 | 資源不存在 (404) |
| 4 | 輸入驗證錯誤 |

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

此 CLI 內建 [Claude Code Skill](https://docs.anthropic.com/en/docs/claude-code)，讓 Claude 能自動查詢 issue 並分析程式碼中的問題。

```bash
# 在專案中安裝 Skill
ct init-skill
```

安裝後，在 Claude Code 中提到任何 issue（例如「幫我看 CT-42」），Claude 就會自動取得 issue 詳情並協助定位相關程式碼。

### 設定方式

認證支援兩種方式：

1. **互動式登入**（推薦）：執行任何指令，依提示操作即可
2. **環境變數**：設定 `CURL_TICKET_URL` 和 `CURL_TICKET_TOKEN`

### 系統需求

- Node.js >= 20
- 一個已部署的 Curl Ticket 站台

---

## License

MIT
