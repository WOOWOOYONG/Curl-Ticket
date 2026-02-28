# 📝 產品需求文件 (PRD) - Curl Ticket

**Version:** 2.1  
**Last Updated:** 2026-02-28  
**Status:** Draft

---

## 1. 專案概述 (Project Overview)

**Curl Ticket** 是一個專為開發團隊設計的 API 問題追蹤與溝通工具。目標是降低前後端協作時的重現成本，並提供一般任務 (Task) 追蹤能力。

- **核心痛點：** API 錯誤回報資訊不完整，後端難以重現 Header/Body 與當下情境。
- **核心價值：** 透過 cURL 解析快速還原請求現場，縮短排查時間。
- **目標用戶：** 前端工程師、後端工程師、QA 測試人員。
- **技術棧：** Nuxt 4, Supabase (Auth, DB, Realtime), Drizzle ORM, Zod, Tailwind CSS, curlconverter.

## 2. 文件導覽 (Document Map)

| 文件 | 範圍 | 主要需求 ID Prefix |
| --- | --- | --- |
| [auth.md](./auth.md) | 登入、邀請註冊、角色、使用者選單 | `AUTH-*` |
| [projects.md](./projects.md) | 專案列表、建立、成員管理、成員邀請 | `PROJ-*` |
| [issues.md](./issues.md) | Issue 列表、新增/編輯、詳細頁 | `ISSUE-*` |
| [notifications.md](./notifications.md) | 通知中心、Realtime、觸發規則 | `NOTIF-*` |
| [data-model.md](./data-model.md) | DB Schema、資料約束、追蹤矩陣 | `DATA-*` |
| [non-functional.md](./non-functional.md) | 效能、安全、相容性、DX | `NFR-*` |
| [roadmap.md](./roadmap.md) | 開發階段規劃 | `ROAD-*` |
| [changelog.md](./changelog.md) | 文件版本變更歷史 | `DOC-*` |

## 3. 需求 ID 規範 (Requirement ID Convention)

- 每條功能或非功能需求都必須有唯一 ID（例如 `AUTH-001`）。
- 跨檔引用一律使用需求 ID，不使用段落編號（例如「見 `ISSUE-024`、`DATA-006`」）。
- 已發布 ID 不重複使用；需求廢棄時標記 `Deprecated`，不可刪除 ID。

## 4. 資訊架構 (Information Architecture)

```mermaid
graph TD
    Register[註冊頁] -->|輸入邀請碼| ValidateCode[驗證邀請碼]
    ValidateCode -->|未登入| GoogleOAuth[Google OAuth]
    GoogleOAuth -->|Callback| Confirm[/confirm]
    Confirm -->|兌換邀請碼 + 建立 Profile| Dashboard
    ValidateCode -->|已登入| RedeemCode[兌換邀請碼 + 建立 Profile]
    RedeemCode --> Dashboard

    Login[登入頁] -->|Auth Success| Dashboard[首頁 - Project 列表]
    Dashboard -->|Create| CreateProject[新增專案頁]
    Dashboard -->|Select Project| IssueList[Issue 列表頁]

    IssueList -->|Select Issue| IssueDetail[Issue 詳細頁]
    IssueList -->|Create| CreateIssue[新增 Issue 頁]
    IssueList -->|Members| ProjectMembers[專案成員管理頁]

    ProjectMembers -->|Invite| SendInvitation[發送專案邀請]
    ProjectMembers -->|Remove| RemoveMember[移除成員]

    CreateIssue -->|Action| ParseCurl[解析 cURL]
    CreateIssue -->|Action| SaveIssue[儲存 Issue]

    IssueDetail -->|Edit| EditIssue[編輯 Issue 頁]
    IssueDetail -->|Action| CopyCurl[複製 cURL]

    GlobalNav --> UserMenu[使用者選單 (Theme/登出)]
    GlobalNav --> Notifications[通知中心 (Realtime)]
    AdminSidebar[Sidebar - Admin] --> AdminPage[邀請管理頁]
    System --> NotFound[404 錯誤頁]
```

## 5. 文件品質驗收 (Documentation QA)

- `DOC-QA-001`：新成員可在 3 分鐘內定位任一功能需求（透過文件導覽 + 需求 ID）。
- `DOC-QA-002`：變更 Issue 類型時，僅需修改 [issues.md](./issues.md) 與 [data-model.md](./data-model.md)。
- `DOC-QA-003`：任一需求可追溯到資料欄位與驗證規則（見 [data-model.md](./data-model.md) 追蹤矩陣）。

## 6. 維護原則 (Maintenance)

- 功能變更先更新對應模組文件，再同步更新 [changelog.md](./changelog.md)。
- 涉及資料結構變動時，必須同步更新 [data-model.md](./data-model.md)。
- 本文件是入口索引；具體規格以模組文件為準。
