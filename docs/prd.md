# 📝 產品需求文件 (PRD) - Curl Ticket

**Version:** 1.3
**Last Updated:** 2026-02-08
**Status:** Draft

---

## 1. 專案概述 (Project Overview)

**Curl Ticket** 是一個專為開發團隊設計的 API 問題追蹤與溝通工具。旨在解決前後端協作（Integration）過程中，資訊傳遞混亂、Payload 格式錯誤難以重現的問題。

- **核心痛點：** 前端回報 API 錯誤時，往往只給截圖或模糊描述，後端難以精準重現當下的 Request Header/Body。
- **核心價值：** 透過解析 cURL 指令，一鍵還原 API 請求現場，大幅降低溝通成本。
- **目標用戶：** 前端工程師、後端工程師、QA 測試人員。
- **技術棧：** Nuxt 4, Supabase (Auth, DB, **Realtime**), Drizzle ORM, Zod, Tailwind CSS, curlconverter.

---

## 2. 資訊架構 (Information Architecture)

```mermaid
graph TD
    InviteLink[邀請連結] -->|驗證 Token| InvitePage[邀請頁]
    InvitePage -->|Google OAuth| Confirm[OAuth Callback]
    Confirm -->|兌換 Token + 建立 Profile| Dashboard

    Login[登入頁] -->|Auth Success| Dashboard[首頁 - Project 列表]
    Dashboard -->|Create| CreateProject[新增專案頁]
    Dashboard -->|Select Project| IssueList[Issue 列表頁]

    IssueList -->|Select Issue| IssueDetail[Issue 詳細頁]
    IssueList -->|Create| CreateIssue[新增 Issue 頁]

    CreateIssue -->|Action| ParseCurl[解析 cURL]
    CreateIssue -->|Action| SaveIssue[儲存 Issue]

    IssueDetail -->|Edit| EditIssue[編輯 Issue 頁]
    IssueDetail -->|Action| CopyCurl[複製 cURL]

    GlobalNav --> Settings[設定/登出]
    GlobalNav --> Notifications[通知中心 (Realtime)]
    AdminSidebar[Sidebar - Admin] --> AdminPage[邀請管理頁]
    System --> NotFound[404 錯誤頁]

```

---

## 3. 功能需求規格 (Functional Requirements)

### 3.1 登入與認證 (Authentication)

- **頁面路徑：** `/login`
- **功能描述：**
- 提供 Google OAuth 登入 (Supabase Auth)。
- 強制路由守衛 (Route Guard)：未登入訪問受保護頁面，自動重導向至此。
- 登入成功後跳轉至首頁。
- 已有帳號的用戶直接顯示 Google 登入按鈕；無帳號用戶顯示提示「需要邀請連結才能註冊」。

### 3.1.1 邀請連結註冊 (Invitation Link Registration) **[New]**

- **頁面路徑：** `/invite/[token]`
- **功能描述：**
  - **僅限受邀用戶註冊**：系統採用封閉註冊制，新用戶必須透過 Admin 產生的邀請連結才能註冊。
  - **註冊流程：**
    1. Admin 在邀請管理頁 (`/admin`) 產生邀請連結。
    2. Admin 透過任意管道（Slack、LINE、Email 等）將連結分享給受邀者。
    3. 受邀者點擊連結 → 系統驗證 token 有效性（未使用、未過期）。
    4. 驗證通過 → 顯示 Google 登入按鈕，token 暫存 `sessionStorage`。
    5. 完成 Google OAuth → `/confirm` 頁自動兌換 token 並建立用戶 Profile。
    6. 跳轉至首頁。
  - **驗證失敗情境：** token 無效、已使用、已過期 → 顯示錯誤訊息與返回登入頁按鈕。
  - **邀請連結為一次性使用**，兌換後即失效。

### 3.1.2 邀請管理 (Invitation Management - Admin) **[New]**

- **頁面路徑：** `/admin`
- **存取限制：** 僅限 `admin` 角色，透過 Client-side middleware 與 Server-side API 雙重檢查。Sidebar 僅對 Admin 顯示入口。
- **功能描述：**
  - **產生邀請連結**：點擊按鈕產生唯一 token，自動組合為完整 URL。
  - **邀請連結列表**：顯示所有已產生的邀請連結，包含：
    - Token 路徑（`/invite/{token}`）
    - 狀態（可使用 / 已使用）
    - 建立時間、使用時間、過期時間
  - **一鍵複製**：可使用狀態的連結提供複製按鈕。

### 3.1.3 用戶角色 (User Roles) **[New]**

- **角色定義：**
  - `admin`：系統管理員，可產生邀請連結、管理用戶。
  - `user`：一般用戶，可使用系統所有業務功能（專案、Issue 等）。
- **首位 Admin 設定：** 部署後由開發者透過 SQL 手動將自己的 Profile 設為 `admin`。
- **Profile 自動建立：** 用戶首次通過 API 驗證時，Server middleware 自動建立 Profile（預設角色為 `user`）。

### 3.2 專案列表 (Dashboard) - 首頁

- **頁面路徑：** `/`
- **UI 呈現：** 卡片式 (Grid) 佈局。
- **功能描述：**
- 顯示所有已建立的專案卡片。
- **卡片資訊：** 專案名稱、代號 (Key, 如 `MEM`)、Open Issues 數量、最後更新時間。
- 提供「新增專案」入口按鈕。

### 3.3 專案新增 / 編輯 (Project Management)

- **頁面路徑：** `/projects/create` 或 `/projects/[id]/settings`
- **功能描述：**
- **表單欄位：**
- 專案名稱 (必填)
- 專案代號 Key (必填，全站唯一，如 `MEM`)
- 描述 (選填)

- **驗證 (Zod)：** Key 必須檢查是否重複。

### 3.4 Issue 列表頁 (Issue List)

- **頁面路徑：** `/projects/[id]`
- **UI 呈現：** 表格 (Table) 佈局，高密度資訊。
- **功能描述：**
- 顯示該專案下的所有 Issues。
- **欄位定義：**
- **ID:** 專案代號 + 流水號 (例如 `MEM-12`)。
- **環境 (Env):** 顯示 Badge (Local, Dev, Staging, Prod)，以顏色區分。
- **狀態 (Status):** Icon 顯示 (Open, In Progress, Done)。
- **Method:** Colored Badge (GET, POST, PUT, DELETE)。
- **標題 (Title):** 簡述問題。
- **URL:** 顯示 API Endpoint。
- **建立者 / 時間**。

- **篩選功能：**
- Status (Open/Closed)
- **Environment (Local/Dev/Prod)**

- **搜尋功能：** 針對標題進行關鍵字搜尋。

### 3.5 新增 / 編輯 Issue (Create/Edit Issue) - 核心功能

- **頁面路徑：** `/projects/[id]/issues/create`
- **UI 呈現：** 左右分割佈局 (Split View)。
- **功能描述：**
  **A. 左側 (Source & Response)：**
- **cURL Input:** 大區塊 Textarea (Dark Mode) 供貼上前端 Console 複製的 cURL 指令。
- **解析按鈕:** 點擊後觸發 `curlconverter`，自動填寫右側表單。
- **Response Status (選填):** 輸入 HTTP Status Code (如 400, 500)。
- **Response Body (選填):** Textarea，供貼上後端回傳的 Error JSON，支援 JSON Syntax Highlighting。

**B. 右側 (Parsed Form)：**

- **Environment (必填):** 下拉選單 (Local, Dev, Staging, Prod)。
- _自動判斷邏輯：_ 若解析出的 URL Host 包含 `localhost` 或 `127.0.0.1`，自動選中 `Local`。

- **基本資訊:** Title (必填), Method, URL。
- **Request Headers / Body:**
- 自動填入解析後的 JSON。
- 使用 Code Editor (Monaco/CodeMirror) 顯示，支援格式化 (Prettier)。

- **Description (選填):** Markdown 編輯器，用於描述「預期行為 vs 實際行為」。

### 3.6 Issue 詳細內容頁 (Issue Detail)

- **頁面路徑：** `/projects/[id]/issues/[issueId]`
- **UI 呈現：** 詳情佈局 (Detail View)。
- **功能描述：**
- **Header:** 顯示 Friendly ID (`MEM-12`), Title, Status, **Environment Badge**。
- **Actions:**
- **"Copy as cURL"**: 一鍵將 Request 資訊還原為 cURL 指令到剪貼簿。
- 編輯 / 刪除 / 變更狀態。

- **Request Context:** 唯讀展示 Method, URL, Headers, Request Body (JSON)。
- **Response Context:**
- 若有紀錄，顯示 Response Status 與 Response Body (JSON)。
- 顯示 Description (Markdown 渲染)。

### 3.7 設定 / 個人檔案 (Settings)

- **頁面路徑：** `/settings`
- **功能描述：** 顯示當前登入者資訊 (Email)、登出按鈕。

### 3.8 通知系統 (Notifications) **[New]**

- **UI 呈現：** Global Nav 右上角鈴鐺 Icon (含未讀紅點計數)。
- **功能描述：**
- **即時推播 (Realtime):** 透過 WebSocket 監聽，當 Issue 狀態變更時，接收者無需重新整理即可看到紅點更新。
- **通知列表:** 點擊鈴鐺展開下拉選單，顯示最近通知。
- **點擊行為:** 點擊通知項目跳轉至該 Issue 詳細頁，並自動標記為已讀。
- **觸發規則:** 當 Issue 狀態 (Status) 被其他人更新時，通知該 Issue 的**建立者 (Created By)**。

---

## 4. 資料庫設計 (Database Schema)

_基於 Supabase (PostgreSQL) + Drizzle ORM_

### Users Table

_(Standard Supabase Auth Ref)_

### Profiles Table **[New]**

| Column       | Type         | Constraint       | Description                               |
| ------------ | ------------ | ---------------- | ----------------------------------------- |
| `id`         | uuid         | PK               | 對應 Supabase auth.users.id（非自動產生） |
| `email`      | varchar(255) | Unique, Not Null | 用戶 Email                                |
| `name`       | varchar(255) |                  | 用戶名稱                                  |
| `role`       | varchar(20)  | Not Null, Default 'user' | 角色 (admin / user)              |
| `created_at` | timestamp    | Default Now()    |                                           |
| `updated_at` | timestamp    | Default Now()    |                                           |

### Invitation Codes Table **[New]**

| Column       | Type         | Constraint       | Description                          |
| ------------ | ------------ | ---------------- | ------------------------------------ |
| `id`         | uuid         | PK               | Default gen_random_uuid()            |
| `code`       | varchar(32)  | Unique, Not Null | 邀請 token（用於組合邀請連結 URL）   |
| `created_by` | uuid         | Not Null         | 產生此邀請的 Admin                   |
| `used_by`    | uuid         |                  | 使用此邀請的用戶                     |
| `is_used`    | boolean      | Default false    | 是否已被使用                         |
| `expires_at` | timestamp    |                  | 過期時間（可選）                     |
| `created_at` | timestamp    | Default Now()    |                                      |
| `used_at`    | timestamp    |                  | 使用時間                             |

### Project Invitations Table **[New - 預留]**

| Column       | Type         | Constraint        | Description                        |
| ------------ | ------------ | ----------------- | ---------------------------------- |
| `id`         | uuid         | PK                | Default gen_random_uuid()          |
| `project_id` | uuid         | FK -> projects.id | 所屬專案（cascade delete）         |
| `email`      | varchar(255) | Not Null          | 被邀請者 Email                     |
| `invited_by` | uuid         | Not Null          | 邀請者 ID                          |
| `status`     | varchar(20)  | Default 'pending' | 狀態 (pending / accepted / expired)|
| `expires_at` | timestamp    |                   | 過期時間                           |
| `created_at` | timestamp    | Default Now()     |                                    |
| `accepted_at`| timestamp    |                   | 接受時間                           |

> **💡 備註：** Project Invitations 為專案層級邀請功能的預留 Schema，功能尚未實作。

### Projects Table

| Column         | Type      | Constraint       | Description                                  |
| -------------- | --------- | ---------------- | -------------------------------------------- |
| `id`           | uuid      | PK               | 專案唯一識別碼                               |
| `name`         | text      | Not Null         | 專案名稱                                     |
| `key`          | text      | Unique, Not Null | 專案代號 (如 MEM)                            |
| `description`  | text      |                  | 專案描述                                     |
| `environments` | text[]    | Not Null         | 專案可用環境 (Local, Dev, Staging, Prod)     |
| `created_at`   | timestamp | Default Now()    |                                              |

### Issues Table

| Column            | Type      | Constraint        | Description                   |
| ----------------- | --------- | ----------------- | ----------------------------- |
| `id`              | serial    | PK                | 內部自動遞增 ID               |
| `project_id`      | uuid      | FK -> projects.id | 所屬專案                      |
| `issue_number`    | int       | Not Null          | **專案內流水號** (1, 2, 3...) |
| `project_key`     | text      | Not Null          | **冗餘欄位** (直接顯示 MEM-1) |
| `title`           | text      | Not Null          | 標題                          |
| `description`     | text      |                   | 問題詳細描述 (Markdown)       |
| `method`          | text      | Not Null          | GET, POST, PUT...             |
| `url`             | text      | Not Null          | 完整的 API Endpoint           |
| `environment`     | text      | Default 'Dev'     | Local, Dev, Staging, Prod     |
| `request_body`    | jsonb     |                   | 請求 Payload                  |
| `request_headers` | jsonb     |                   | 請求 Headers                  |
| `response_status` | int       |                   | HTTP Status Code (e.g., 500)  |
| `response_body`   | jsonb     |                   | 錯誤回傳 Payload              |
| `status`          | text      | Default 'Open'    | Open, In Progress, Done       |
| `created_by`      | uuid      | FK -> users.id    | 建立者                        |
| `created_at`      | timestamp | Default Now()     |                               |

### Notifications Table **[New]**

| Column       | Type      | Constraint      | Description                     |
| ------------ | --------- | --------------- | ------------------------------- |
| `id`         | uuid      | PK              | Default gen_random_uuid()       |
| `user_id`    | uuid      | FK -> users.id  | **接收通知的人**                |
| `issue_id`   | int       | FK -> issues.id | 關聯的 Issue                    |
| `title`      | text      | Not Null        | 通知標題                        |
| `content`    | text      |                 | 通知內容 (如 "狀態變更為 Done") |
| `is_read`    | boolean   | Default false   | 是否已讀                        |
| `created_at` | timestamp | Default Now()   |                                 |

> **💡 技術實作筆記 (Backend Logic):**
>
> 1. **Issue Numbering:** 需實作 DB Trigger 或 App Logic，Insert 時自動計算 `max(issue_number) + 1`。
> 2. **Notification Trigger (DB 層自動化):**
>
> - 需建立 Postgres Function `notify_issue_status_change`。
> - 需建立 Trigger `after update on issues`。
> - 邏輯：當 `old.status != new.status`，自動 Insert 一筆資料到 `notifications` 表給 `created_by` 使用者。
>
> 3. **Realtime Setup:** 必須在 Supabase Dashboard 或 SQL 執行 `alter publication supabase_realtime add table notifications;` 以開啟 WebSocket 監聽。

---

## 5. 非功能需求 (Non-Functional Requirements)

1. **效能 (Performance)：**

- API 回應時間應 < 200ms。
- **Realtime:** WebSocket 連線需處理斷線重連 (Reconnection) 機制 (Supabase SDK 已內建)。

2. **安全性 (Security)：**

- **Payload 驗證:** API 需驗證 Zod Schema。
- **封閉註冊制:** 僅持有有效邀請連結的用戶才能完成註冊，防止未授權存取。
- **角色存取控制:** Admin API 透過 Server-side `requireAdmin()` 檢查，前端透過 middleware 限制頁面存取。
- **RLS (Row Level Security):**
- `issues`: 僅專案成員可讀寫。
- `notifications`: **僅使用者本人 (`auth.uid() = user_id`) 可讀取自己的通知**。

- **敏感資料遮罩:** UI 層針對 `Authorization` Header 預設隱藏。

3. **瀏覽器相容性 (Compatibility)：**

- 支援 Chrome, Edge, Safari, Firefox 最新版。

4. **開發體驗 (DX)：**

- 全專案啟用 TypeScript Strict Mode。

---

## 6. 開發階段規劃 (Development Roadmap)

### Phase 1: MVP (核心價值驗證)

- **目標：** 完成基礎建設，讓使用者能透過 cURL 建立並分享 Issue。
- **功能：**
- Supabase Auth & Project CRUD。
- **Issue 建立流程：** cURL 解析 -> 自動判斷 Env -> 填寫 Response -> 儲存。
- **Issue 詳細頁：** 呈現完整資訊與 "Copy as cURL"。

### Phase 2: Collaboration (協作優化)

- **目標：** 提升團隊管理與溝通效率。
- **功能：**
- Issue 列表篩選 (Status, Environment)。
- 狀態變更 (Open -> Done)。
- **即時通知系統 (Realtime Notifications):** 資料庫 Trigger + WebSocket 前端整合。
- **邀請連結註冊系統：** Admin 產生邀請連結、封閉式註冊、用戶角色管理。
- **專案成員存取控制：** Owner / Member 權限區分。

### Phase 2.5: Invitation Enhancement (邀請擴展) **[Planned]**

- **目標：** 擴展邀請機制至專案層級。
- **功能：**
- **專案邀請：** 專案 Owner 可透過 Email 邀請已註冊用戶加入專案。
- **邀請通知：** 被邀請者可在系統內查看並接受專案邀請。

### Phase 3: Polish (體驗升級)

- **目標：** UX 細節打磨。
- **功能：**
- 環境變數對應設定 (Project Settings)。
- 留言評論功能 (Comments)。
- Loading State 與 Error Handling 優化。
