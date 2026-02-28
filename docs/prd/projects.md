# 3.2-3.3 專案模組 (Projects)

## 範圍

本文件涵蓋首頁專案列表、專案建立、專案設定與專案成員邀請。

## Functional Requirements

### 3.2 專案列表 (Dashboard)

- `PROJ-001`：首頁路徑為 `/`，以卡片式 Grid 顯示專案列表。
- `PROJ-002`：專案卡片需顯示：專案名稱、專案代號 Key、Open Issues 數量、最後更新時間。
- `PROJ-003`：首頁需提供「新增專案」入口按鈕。

### 3.3 專案新增 (Project Create)

- `PROJ-004`：專案建立頁路徑為 `/projects/create`。
- `PROJ-005`：建立表單欄位：`name`（必填）、`key`（必填，全站唯一）、`description`（選填）。
- `PROJ-006`：`key` 重複檢查需在 Schema 驗證與 Server 寫入階段雙重保護。
- `PROJ-007`：建立專案後，建立者自動成為 Owner。

### 3.3.1 專案設定 (Project Settings)

- `PROJ-008`：專案設定頁路徑為 `/projects/[id]/settings`。
- `PROJ-009`：僅 Owner 可存取設定頁，非 Owner 顯示無法存取。
- `PROJ-010`：Issue 列表頁 Header 的 Settings 按鈕僅 Owner 可見。
- `PROJ-011`：設定頁需顯示成員列表（名稱、Email、Owner Badge）。
- `PROJ-012`：Owner 可移除非自己的成員，不可移除自己。
- `PROJ-013`：設定頁需提供邀請已註冊用戶加入專案的入口。
- `PROJ-014`：邀請記錄需顯示 Email、狀態（`pending`/`accepted`/`expired`）、建立時間。

### 3.3.2 專案邀請 (Project Invitation)

- `PROJ-015`：Owner 透過 Email 發送專案邀請。
- `PROJ-016`：邀請前必須驗證：Email 已註冊、非自己、非現有成員、且無重複 pending 邀請。
- `PROJ-017`：建立邀請記錄時預設 7 天過期，並自動建立通知給被邀請者。
- `PROJ-018`：被邀請者可於通知中心開啟邀請回應 Modal。
- `PROJ-019`：接受邀請後需自動加入 `project_members`，並標記通知為已讀。
- `PROJ-020`：未接受時維持 `pending`，到期後轉為 `expired`。
- `PROJ-021`：邀請狀態僅允許 `pending`、`accepted`、`expired`。
- `PROJ-022`：僅邀請對象本人可回應邀請，Server 端需驗證身份與邀請資料一致。

## Cross-References

- 通知行為：見 [notifications.md](./notifications.md) 的 `NOTIF-006`、`NOTIF-008`。
- 資料欄位與約束：見 [data-model.md](./data-model.md) 的 `DATA-003`、`DATA-004`、`DATA-005`。
