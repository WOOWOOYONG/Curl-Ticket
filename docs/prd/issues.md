# 3.4-3.6 Issue 模組 (Issues)

## 範圍

本文件涵蓋 Issue 列表、Issue 新增/編輯、Issue 詳細頁三個核心流程。

## Functional Requirements

### 3.4 Issue 列表頁 (Issue List)

- `ISSUE-001`：Issue 列表頁路徑為 `/projects/[id]`。
- `ISSUE-002`：UI 以高密度 Table 佈局顯示。
- `ISSUE-003`：頁面提供 `API Bug` / `Task` 兩個 Tab，預設為 `API Bug`。
- `ISSUE-004`：Tab 狀態需同步 URL query（`?type=api_bug` / `?type=task`）。
- `ISSUE-005`：列表資料僅包含當前專案的 Issues。
- `ISSUE-006`：ID 欄位顯示 Friendly ID（`{PROJECT_KEY}-{issue_number}`）與類型圖示。
- `ISSUE-007`：標題欄位需顯示標題；`api_bug` 類型在標題下方顯示 URL。
- `ISSUE-008`：Method 僅 `api_bug` 類型顯示；`task` 類型顯示 `—`。
- `ISSUE-009`：狀態欄位使用 Icon 並限制於 `Open`、`In Progress`、`Done`、`Close`。
- `ISSUE-010`：Environment 僅 `api_bug` 類型顯示；`task` 類型顯示 `—`。
- `ISSUE-011`：需提供更新時間欄位。
- `ISSUE-012`：搜尋功能需支援標題與 URL 關鍵字。
- `ISSUE-013`：分頁每頁 10 筆，需顯示頁碼導覽與分頁資訊。

### 3.5 新增 / 編輯 Issue (Create/Edit Issue)

- `ISSUE-014`：新增頁路徑為 `/projects/[id]/issues/create`。
- `ISSUE-015`：編輯頁路徑為 `/projects/[id]/issues/[issueId]/edit`。
- `ISSUE-016`：新增模式可切換 `API Bug` / `Task` 類型。
- `ISSUE-017`：編輯模式不可切換 `issueType`，表單依現有資料類型渲染。

#### A. API Bug 表單 (`issueType = api_bug`)

- `ISSUE-018`：表單採左右分割佈局（左：來源與回應，右：解析結果）。
- `ISSUE-019`：左側提供深色大面積 cURL 輸入區。
- `ISSUE-020`：左側提供「解析 cURL」按鈕，使用 `curlconverter` 自動填入解析欄位。
- `ISSUE-021`：左側 Response 區塊可收合，支援 `response_status` 與 `response_body`（選填，JSON 顯示）。
- `ISSUE-022`：右側需有 `Issue Title`（必填）。
- `ISSUE-023`：右側需有 `Environment`（必填，下拉：Local/Dev/Staging/Prod）。
- `ISSUE-024`：若 URL host 包含 `localhost` 或 `127.0.0.1`，Environment 自動預設 `Local`。
- `ISSUE-025`：右側需顯示唯讀 Request Preview（Method、URL、Headers、Body）。
- `ISSUE-026`：`Title`、`URL`、`Method` 均有效時才可提交 `api_bug`。

#### B. Task 表單 (`issueType = task`)

- `ISSUE-027`：Task 表單為單欄，僅包含 `Task Title`（必填）與 `Description`（選填）。
- `ISSUE-028`：Task 類型不包含 cURL、Method、URL、Environment、Request/Response 欄位。
- `ISSUE-029`：Task 只需 `Title` 有值即可提交。

#### 共通行為

- `ISSUE-030`：Footer 提供 `Discard` 與 `Create Issue / Save Changes` 兩個操作按鈕。
- `ISSUE-031`：編輯提交 payload 不得傳送 `issueType` 欄位。
- `ISSUE-032`：Server 端必須拒絕對 `task` 類型更新 API 專屬欄位。
- `ISSUE-053`：表單需提供 `Assignee` 下拉（`Unassigned` + 專案成員 / owner），適用 `api_bug` 與 `task`。
- `ISSUE-054`：任何對該專案有存取權的成員或 owner 皆可指派 / 取消指派 Issue（無額外角色限制）。
- `ISSUE-055`：指派 / 重新指派使得新負責人與操作者不同時，系統必須透過 bell 發送 `issue_update` 通知；自我指派與取消指派不觸發通知。

### 3.6 Issue 詳細內容頁 (Issue Detail)

- `ISSUE-033`：詳細頁路徑為 `/projects/[id]/issues/[issueId]`。
- `ISSUE-034`：頁面採左右雙欄（左側主內容 + 右側 metadata）。
- `ISSUE-035`：Header 需顯示 Friendly ID、Issue Type、Title、Description、Status 下拉。
- `ISSUE-036`：右側 Sidebar 需顯示 Type、Created 日期、Last Updated、Assignee（未指派時顯示 `Unassigned`）、Edit Details 按鈕。

#### API Bug 詳細頁

- `ISSUE-037`：提供 `Copy as cURL` 操作。
- `ISSUE-038`：顯示 Method Badge + 完整 URL（含複製按鈕）。
- `ISSUE-039`：顯示 Response Status 與 Environment Badge。
- `ISSUE-040`：提供 `Request Body` / `Request Headers` / `Response` 三個 Tab，皆支援複製。
- `ISSUE-041`：`Request Headers` 顯示時需對敏感欄位自動遮罩，不可回傳原始敏感值（目前 UI 顯示格式為 `******` 或 `Bearer ******`）。

#### Task 詳細頁

- `ISSUE-042`：Task 不顯示 API 相關區塊（Method、URL、Headers、Request/Response）。
- `ISSUE-043`：Task 以獨立卡片顯示 Description，格式採 `whitespace-pre-wrap`。

### 3.7 Issue 留言 (Issue Comments)

- `ISSUE-044`：Issue 詳細頁左欄底部需顯示留言區塊，適用 `api_bug` 與 `task`。
- `ISSUE-045`：留言依 `created_at` 由舊到新排序。
- `ISSUE-046`：每則留言顯示留言者名稱（Email fallback）、內容、建立時間（相對時間）。
- `ISSUE-047`：留言區塊頂部顯示留言總數（例如 "Comments (3)"）。
- `ISSUE-048`：列表下方提供文字輸入框與送出按鈕。
- `ISSUE-049`：留言純文字，1~2000 字。
- `ISSUE-050`：使用者僅可刪除自己的留言，刪除前需確認。
- `ISSUE-051`：無留言時顯示空狀態提示。
- `ISSUE-052`：新增留言後列表即時更新。

### 3.8 Assigned to me view (My Issues)

- `ISSUE-053`：系統需提供跨 Project 的「指派給我」頁，路徑為 `/my-issues`。
- `ISSUE-054`：頁面資料來自 `GET /api/me/issues`，僅回傳 `assignee_id = 目前使用者` 且 Project 仍可存取的 Issues。
- `ISSUE-055`：預設列表排除 `status = Close`，但 `summary.close` 仍需反映真實計數。
- `ISSUE-056`：頁面需提供 Status（多選）、Project、Environment、排序、關鍵字篩選，且篩選條件以 URL query 儲存。
- `ISSUE-057`：頁面需顯示 `summary`（Open / In Progress / Done / Total）四張統計卡，並在零指派與零符合條件下分別顯示不同 Empty State。
- `ISSUE-058`：Sidebar 需新增「My Issues」入口（`i-lucide-inbox`），置於 Projects 與 Admin 間，對所有已註冊使用者可見，並可顯示 `open + in-progress` 數量徽章。
- `ISSUE-059`：Dashboard (`/`) 需新增「Assigned to me」區塊，顯示最多 5 筆最近更新的指派 Issue 與「View all」連結；若無指派則隱藏。

### 3.9 Public Issue Page

- `ISSUE-060`：Public Issue Page 提供既有 `api_bug` Issue 的 read-only 分享頁，路徑為 `/share/issues/[token]`。
- `ISSUE-061`：未登入訪問 Public Issue Page 不得被 Client-side auth middleware 重導到 `/login`。
- `ISSUE-062`：Public Issue Page 僅能透過不可猜測的 Share Token 存取，不得在公開 URL 暴露 Project ID、Issue ID 或 Friendly ID 作為查詢識別。
- `ISSUE-063`：Public Sharing 預設關閉，需由具備 Project access 的已註冊使用者在 Issue 詳細頁手動開啟。
- `ISSUE-064`：Public Sharing 僅適用 `api_bug` Issue；`task` Issue 不可開啟 Public Sharing。
- `ISSUE-065`：開啟 Public Sharing 時需產生新的 Share Token，並回傳 Share Link 供使用者複製。
- `ISSUE-066`：關閉 Public Sharing 時需清除 Share Token；舊 Share Link 必須立即失效。
- `ISSUE-067`：已開啟 Public Sharing 的 Issue 可重新產生 Share Token；舊 Share Link 必須立即失效，新 Share Link 可用。
- `ISSUE-068`：不存在、已停用、或已刪除 Issue 對應的 Share Token 一律回傳相同的 not found 狀態，不揭露失效原因。
- `ISSUE-069`：Public Issue Page 顯示 live Issue 內容，不保存啟用分享當下的 snapshot。
- `ISSUE-070`：Public Issue Page 顯示重現 API Bug 所需內容：Friendly ID、Title、Description、Method、URL、Environment、Request Headers、Request Body、Response Status、Response Body、Created/Updated time。
- `ISSUE-071`：Public Issue Page 不顯示內部管理資訊：Status 下拉、Assignee、Comments、Edit/Delete 操作、Project members、Owner、internal numeric Issue ID、Project ID、Created By user ID。
- `ISSUE-072`：Public API (`GET /api/public/issues/[token]`) 必須回傳 public-safe DTO；敏感 request headers 必須在 server response 前遮罩，不得把 raw secret values 回傳給匿名瀏覽器。
- `ISSUE-073`：Public Issue Page 不自動清洗 Request Body 或 Response Body；開啟 Public Sharing 前需以 confirmation 提醒使用者 body 內容會對知道 Share Link 的人可見。
- `ISSUE-074`：Public Issue Page header 僅顯示左側 `Curl Ticket` 與右側語言選單，不顯示 sidebar、登入 CTA 或管理導航。
- `ISSUE-075`：Public Issue Page 需沿用現有 i18n 機制與語言選單，新增文案不得硬寫單一語言。
- `ISSUE-076`：已登入 Issue Detail GET 需回傳 `publicShare` 狀態，供右側 metadata sidebar 渲染分享管理 UI。
- `ISSUE-077`：Public Sharing 管理 API 只回傳 share 狀態 DTO，不回傳完整 Issue payload。
- `ISSUE-078`：Public API 不得設定長時間快取；關閉或重新產生 Share Token 後，舊 Share Link 下一次請求必須回傳 not found。

詳見資料約束：[data-model.md](./data-model.md) 中 `issues.assignee_id`、`issues.public_share_token`、`issues.public_shared_at` 欄位；授權條件沿用 `buildProjectAccessCondition`。

## Cross-References

- 通知規則：見 [notifications.md](./notifications.md) 的 `NOTIF-005`、`NOTIF-007`、`NOTIF-009`。
- 資料欄位與約束：見 [data-model.md](./data-model.md) 的 `DATA-006`、`DATA-007`、`DATA-012`、`DATA-014`。
