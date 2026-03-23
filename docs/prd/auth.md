# 3.1 認證與用戶管理 (Authentication & User Management)

## 範圍

本文件涵蓋登入、邀請碼註冊、Admin 邀請碼管理、用戶角色、使用者選單、用戶設定與帳號刪除。

## Functional Requirements

### 3.1 登入與認證

- `AUTH-001`：提供登入頁，路徑為 `/login`。
- `AUTH-002`：登入頁提供 Google OAuth（Supabase Auth）。
- `AUTH-003`：未登入訪問受保護頁面時，Route Guard 必須重導到 `/login`。
- `AUTH-004`：登入成功後導向首頁 `/`。
- `AUTH-005`：已有帳號用戶顯示 Google 登入按鈕；無帳號用戶顯示「需要邀請碼才能註冊」提示。

### 3.1.1 邀請碼註冊

- `AUTH-006`：註冊頁路徑為 `/register`，系統採封閉註冊制。
- `AUTH-007`：新用戶必須先通過 6 位邀請碼驗證才能進入註冊流程。
- `AUTH-008`：邀請碼格式為 6 位大寫英數字，排除易混淆字元（`0/O`, `1/I/L`）。
- `AUTH-009`：邀請碼驗證必須檢查「有效、未使用、未過期」。
- `AUTH-010`：未登入用戶流程：驗證通過後顯示 Google 登入，邀請碼暫存 `sessionStorage`，OAuth 完成後在 `/confirm` 自動兌換並建立 Profile。
- `AUTH-011`：已登入用戶流程：驗證通過後直接兌換邀請碼並建立 Profile。
- `AUTH-012`：兌換成功後跳轉首頁 `/`。
- `AUTH-013`：邀請碼為一次性，兌換後立即失效。
- `AUTH-014`：邀請碼無效、已使用或已過期時，UI 至少需提示邀請碼不可用（可進一步細分錯誤情境）。

### 3.1.2 邀請管理 (Admin)

- `AUTH-015`：邀請管理頁路徑為 `/admin`。
- `AUTH-016`：`/admin` 僅 `admin` 可存取，需同時具備 Client-side middleware 與 Server-side API 雙重檢查。
- `AUTH-017`：Sidebar 的 Admin 入口僅對 `admin` 顯示。
- `AUTH-018`：Admin 可產生唯一 6 位邀請碼。
- `AUTH-019`：邀請碼列表需顯示：邀請碼、狀態（可使用/已使用）、建立時間、使用時間（過期時間欄位為可選擴充）。
- `AUTH-020`：可使用狀態的邀請碼需提供一鍵複製功能。

### 3.1.3 用戶角色

- `AUTH-021`：角色分為 `admin` 與 `user`。
- `AUTH-022`：部署後首位 Admin 由開發者透過 SQL 手動升級。
- `AUTH-023`：用戶兌換邀請碼時建立 Profile，預設角色為 `user`。

### 3.7 使用者選單 / Session 操作

- `AUTH-024`：使用者設定頁面路徑為 `/settings`，Sidebar 提供 sub-menu 導航。
- `AUTH-025`：使用者選單需提供至少登出能力，並提供主題切換（Light / Dark / System）。

### 3.8 用戶設定 (Profile Settings)

- `AUTH-026`：`/settings` 頁面顯示用戶 Email（唯讀）與 Display Name（可編輯）。
- `AUTH-027`：Display Name 可透過 `PATCH /api/auth/profile` 更新，長度上限由 `PROFILE_NAME_MAX_LENGTH` 控制。
- `AUTH-028`：更新成功後即時反映於 Header 及 Sidebar 等全域 UI。

### 3.9 帳號刪除 (Account Deletion)

- `AUTH-029`：`/settings` 頁面提供 Danger Zone 區塊，包含帳號刪除入口。
- `AUTH-030`：刪除需二次確認：用戶必須在 Modal 中輸入 `DELETE` 才能送出。
- `AUTH-031`：若用戶為任一專案的 Owner，Server 端阻止刪除並回傳所擁有的專案清單，UI 提示用戶先轉移或刪除專案。
- `AUTH-032`：帳號刪除採 Soft-delete 機制，透過 `DELETE /api/auth/profile` 設定 `profiles.deleted_at` 時間戳，不實際移除資料。
- `AUTH-033`：刪除後自動登出 Supabase session 並導向 `/login`。
- `AUTH-034`：已刪除帳號的歷史記錄（Issues、Comments 等）保留用戶名稱，不做匿名化處理。
- `AUTH-035`：已 Soft-delete 的帳號若重新以相同 Google OAuth 登入並兌換邀請碼，系統自動恢復（restore）該 Profile，清除 `deleted_at`。

## Cross-References

- 通知流程：見 [notifications.md](./notifications.md) 的 `NOTIF-006`、`NOTIF-008`。
- 資料欄位與約束：見 [data-model.md](./data-model.md) 的 `DATA-001`、`DATA-002`。
