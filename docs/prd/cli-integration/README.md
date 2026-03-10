# 3.9 Claude Code 整合

**Version:** 1.0
**Status:** Draft

---

## 概述

本模組讓 Curl Ticket 的使用者（工程師）能在自己專案的 codebase 裡，透過 Claude Code 直接存取站台 issue，結合本地程式碼進行問題定位與修復。

## 使用者體驗目標

```
首次使用（一次性設定）：
  $ npm install -g @anthropic-ai/curl-ticket-cli
  $ cd /path/to/my-project
  $ curl-ticket init-skill

日常使用（在 Claude Code 中）：
  > 看一下有什麼 open 的 issue

  Claude 執行 curl-ticket issues ... → 偵測未登入
    → 印出登入網址與驗證代碼
    → 使用者在瀏覽器完成 Google OAuth
    → CLI 自動取得 Token、接續執行
    → 回傳 issue 列表

  > CT-42 那個 500 幫我查一下

  Claude 執行 curl-ticket issue ... → 取得詳情
    → 在本地 codebase 搜尋對應 route handler
    → 輸出分析結果與修復建議

  > 修好了，幫我把 issue 標成 Done

  Claude 執行 curl-ticket update-status ... → 完成
```

第二次起，Token 已存於本地 config，所有指令直接執行，使用者完全無感。

## 架構選型：CLI + Skill

選擇 CLI + Skill 而非 MCP Server，原因是 **context window token 效率**：

| 項目 | MCP Server | CLI + Skill |
|------|-----------|-------------|
| 固定成本（每次對話） | ~1,000 tokens（所有 tool schema 常駐 context） | ~60 tokens（僅 Skill metadata） |
| 不使用時的成本 | ~1,000 tokens（照樣佔據 context） | ~60 tokens |
| 觸發後載入成本 | 0 | ~300 tokens（SKILL.md body） |
| 單次呼叫封裝開銷 | ~80 tokens（JSON-RPC 協議） | ~15 tokens（Bash 指令） |
| 典型工作流（列表 + 2 筆詳情） | ~1,320 + 回傳資料 | ~375 + 回傳資料 |

CLI 方案透過 Claude Code 已有的 Bash tool 執行指令，不需額外註冊 tool schema，省下的 context 空間用於分析程式碼。

## 模組文件

| 文件 | 範圍 | 需求 ID Prefix |
|------|------|----------------|
| [api-tokens.md](./api-tokens.md) | API Token 系統、Device Code Flow 登入、站台 UI | `TOKEN-*` |
| [cli.md](./cli.md) | CLI 工具（指令定義、輸出格式、自動 Auth、API Client） | `CLI-*` |
| [skill.md](./skill.md) | Claude Code Skill 檔案規範 | `SKILL-*` |

## 系統架構

```
┌─ 工程師本地環境（任意專案 codebase）──────────────────────────────┐
│                                                                   │
│  Claude Code                                                      │
│  ├── Skill: curl-ticket-issue-analyzer                            │
│  │   └── .claude/skills/curl-ticket/SKILL.md                      │
│  └── Bash tool 執行 curl-ticket CLI                               │
│                                                                   │
│  ┌── curl-ticket CLI ────────┐         ┌── Curl Ticket 站台 ────┐ │
│  │                           │  HTTPS  │                         │ │
│  │  $ curl-ticket issues ... │ ◄─────► │  既有 API:             │ │
│  │  $ curl-ticket issue ...  │ Bearer  │  GET /api/projects     │ │
│  │                           │ Token   │  GET /api/.../issues   │ │
│  │  ensureAuth():            │         │  GET /api/.../issues/n │ │
│  │  偵測未登入 → Device Code │         │  PATCH /api/.../issues │ │
│  │  Flow → 自動取得 Token    │         │                        │ │
│  │                           │         │  新增:                  │ │
│  │  Formatter Layer:         │         │  POST /api/auth/device │ │
│  │  JSON → AI 精簡純文字     │         │  GET /auth/device (頁面)│ │
│  └───────────────────────────┘         │  Token 管理 API + UI   │ │
│                                        └────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

## 開發順序

| 階段 | 交付物 | 驗收標準 |
|------|--------|----------|
| **Phase A** | API Token 系統 | `curl -H "Authorization: Bearer ct_xxx" /api/projects` 成功回傳 |
| **Phase B** | Device Code Flow 登入 | `curl-ticket auth login` 完成瀏覽器登入，Token 自動存入本地 |
| **Phase C** | CLI 核心指令 | `curl-ticket issues` / `curl-ticket issue` 正確輸出精簡格式 |
| **Phase D** | Skill + 整合測試 | Claude Code 中說「看一下 issue」能自動觸發 CLI、分析程式碼 |

Phase A 和 B 可平行開發（前端頁面 + 後端 API 可分工）。Phase C 依賴 A 完成。Phase D 依賴 B + C。

## Cross-References

- 認證架構：見 [auth.md](../auth.md) `AUTH-001` ~ `AUTH-025`
- Project Access 規則：見 [projects.md](../projects.md) `PROJ-001`
- Issue 資料欄位：見 [data-model.md](../data-model.md) `DATA-006`、`DATA-007`
- Issue API endpoint：見 [issues.md](../issues.md) `ISSUE-001` ~ `ISSUE-043`
- 敏感欄位遮罩：見 [non-functional.md](../non-functional.md) `NFR-008`
- 此功能對應 Roadmap Phase 4，見 [roadmap.md](../roadmap.md)
- 資料模型變更（`api_tokens`、`device_codes`）需同步更新 [data-model.md](../data-model.md)
