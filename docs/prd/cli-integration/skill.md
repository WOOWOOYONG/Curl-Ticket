# Claude Code Skill

## 範圍

本文件定義 Skill 檔案（SKILL.md）的內容規範，以及使用者端的設定需求。Skill 讓 Claude Code 能自動判斷何時該呼叫 `curl-ticket` CLI，並指引 Claude 如何從 issue 資訊追蹤到本地程式碼。

---

## C1. Skill 檔案規範

- `SKILL-001`：Skill 檔案路徑為 `.claude/skills/curl-ticket/SKILL.md`（位於使用者的專案目錄中）。
- `SKILL-002`：Skill 隨 CLI npm 套件一起發佈（位於 `packages/cli/skills/curl-ticket/SKILL.md`），透過 `curl-ticket init-skill` 複製到專案。
- `SKILL-003`：Skill 的 frontmatter `name` 為 `curl-ticket-issue-analyzer`。
- `SKILL-004`：Skill 的 frontmatter `description` 需涵蓋以下觸發關鍵字，確保 Claude 能正確判斷何時載入：issue、bug、ticket、錯誤、Curl Ticket、CT-（friendly ID 前綴）、問題追蹤。
- `SKILL-005`：Skill 設定 `user-invocable: false`，僅由 Claude 自動觸發，使用者不手動呼叫。此 Skill 為背景知識，不適合作為 `/slash-command`。

## C2. Skill Body 內容

- `SKILL-006`：SKILL.md body 需列出所有可用的 `curl-ticket` CLI 指令與常用選項，**所有指令範例須帶 `--json` flag**，並明確指示 Agent 一律使用 JSON 模式。
- `SKILL-006a`：SKILL.md body 需包含「JSON Output Format」區塊，列出三種回傳結構（list / single / error）的 JSON schema 範例，供 Agent 預期 response shape。
- `SKILL-007`：SKILL.md body 需包含「分析流程」，以編號步驟指引 Claude 從 issue 資訊到本地 codebase 的追蹤路徑。
- `SKILL-008`：分析流程需包含 endpoint → 本地 route 檔案的對應規則。此規則需為通用型（適用於各種框架），不預設使用者的專案結構。示例對應：`POST /api/users → 搜尋 api/users 相關的 route handler`。
- `SKILL-009`：分析流程需包含 responseStatus 的判斷邏輯：4xx → 驗證、權限、找不到資源；5xx → 程式邏輯錯誤、DB query 問題。
- `SKILL-010`：分析流程需指引 Claude 追蹤完整請求鏈：路由 → middleware → handler → 業務邏輯 → DB query。
- `SKILL-011`：分析流程需指引 Claude 用 `grep` 或檔案搜尋來定位錯誤訊息中的關鍵字。
- `SKILL-012`：SKILL.md body 需包含「注意事項」，提醒 Claude：使用過濾參數縮小查詢範圍（`-s Open`）、一次只深入分析 1-2 筆 issue、Task 類型無 API 資訊，改從 title 和 description 搜尋相關程式碼。
- `SKILL-013`：SKILL.md body 總行數不超過 60 行，控制觸發時的 token 消耗在 ~300 tokens 以內。

### SKILL.md 預期內容結構

```markdown
---
name: curl-ticket-issue-analyzer
description: >
  （觸發關鍵字描述，約 2-3 行）
user-invocable: false
---

# Curl Ticket Issue 分析

## 可用指令
（列出 CLI 指令 + 常用選項，約 6-8 行）

## 分析流程
（編號步驟，約 15-20 行）

## 注意事項
（3-5 點提醒，約 5-8 行）
```

---

## C3. 使用者端設定

- `SKILL-014`：使用者需在 Claude Code 的 `permissions.allow` 中加入 `Bash(curl-ticket:*)`，允許 Claude 執行 CLI 指令。
- `SKILL-015`：權限設定可放在專案級 `.claude/settings.json` 或使用者級 `.claude/settings.local.json`。
- `SKILL-016`：`curl-ticket init-skill`（見 [cli.md](./cli.md) `CLI-044`）執行完成後需提示此權限設定。

### 使用者端完整設定結果

```
.claude/
├── settings.json（或 settings.local.json）
│   └── permissions.allow: ["Bash(curl-ticket:*)"]
└── skills/
    └── curl-ticket/
        └── SKILL.md
```

---

## C4. Claude Code 行為預期

以下描述 Skill 正常運作時 Claude Code 的行為，用於驗收測試。

### 場景 A：首次使用（未登入）

```
使用者：看一下有什麼 open 的 issue

Claude 思考：偵測到 "issue" 關鍵字 → 載入 Skill → 需要先知道 projectId
Claude 執行：curl-ticket projects --json
  → CLI stderr: 印出登入提示與代碼
  → 使用者在瀏覽器完成 OAuth
  → CLI stdout: JSON 專案列表（含 pagination）

Claude 回覆：你有 3 個專案，要看哪個的 issue？
  → 使用者選擇後
Claude 執行：curl-ticket issues <projectId> -s Open --json
Claude 回覆：列出 issue 摘要（從 JSON 的 data 陣列提取）
```

### 場景 B：日常使用（已登入）

```
使用者：CT-42 那個 500 幫我查一下

Claude 思考：偵測到 "CT-42" → 載入 Skill → 需要取得 issue 詳情
Claude 執行：curl-ticket issue <projectId> CT-42 --json
  → CLI stdout: JSON issue 詳情（含完整 endpoint、responseBody、rawCurl）

Claude 思考：從 JSON 直接讀取 method=POST, url=/api/users, responseStatus=500
  → 從 responseBody 欄位取得 "column email cannot be null"
  → 在本地搜尋 api/users 相關的 route handler
  → 讀取對應檔案，追蹤到 DB insert 邏輯
  → 找到缺少 email 欄位的驗證

Claude 回覆：問題在 server/api/users.post.ts 第 23 行，
            insert 時沒有檢查 email 是否存在...（提供修復建議）
```

### 場景 C：修復後更新狀態

```
使用者：修好了，幫我把 issue 標成 Done

Claude 執行：curl-ticket update-status <projectId> CT-42 Done --json
  → CLI stdout: JSON 回傳更新後的完整 issue 資料
Claude 回覆：已將 CT-42 標記為 Done。
```

---

## Cross-References

- CLI 指令定義：見 [cli.md](./cli.md) `CLI-028` ~ `CLI-044`
- CLI 自動登入：見 [cli.md](./cli.md) `CLI-012` ~ `CLI-024`
- CLI 輸出格式：見 [cli.md](./cli.md) `CLI-045` ~ `CLI-056`
- Skill 檔案機制：參考 Claude Code 官方文件 https://code.claude.com/docs/en/slash-commands
