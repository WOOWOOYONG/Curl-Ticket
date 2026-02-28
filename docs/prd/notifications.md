# 3.8 通知系統 (Notifications)

## 範圍

本文件涵蓋通知入口 UI、通知類型、即時更新與觸發規則。

## Functional Requirements

- `NOTIF-001`：Global Nav 右上角提供鈴鐺 Icon，未讀數超過 9 顯示 `9+`。
- `NOTIF-002`：通知類型至少包含 `issue_update` 與 `project_invite`。
- `NOTIF-003`：前端需透過 Supabase Realtime 監聽 `notifications` 表 `INSERT` 事件，接收者不需刷新頁面即可看到未讀狀態更新。
- `NOTIF-004`：通知 Popover 顯示最近 50 筆通知，依 `created_at` 由新到舊排序。
- `NOTIF-005`：點擊 `issue_update` 通知需標記已讀，並導向對應 Issue 詳細頁（導航行為可分階段完成）。
- `NOTIF-006`：點擊 `project_invite` 通知需開啟邀請回應 Modal，支援接受邀請。
- `NOTIF-007`：當 Issue 狀態被其他人更新時，系統需通知該 Issue 的建立者（`created_by`）。
- `NOTIF-008`：專案 Owner 發送邀請時，系統需通知被邀請者。

## Cross-References

- 邀請流程：見 [projects.md](./projects.md) 的 `PROJ-017`、`PROJ-018`、`PROJ-019`。
- DB Trigger 與 Realtime 設定：見 [data-model.md](./data-model.md) 的 `DATA-010`、`DATA-011`。
