# 6. 開發階段規劃 (Development Roadmap)

## 目標

以「先可用、再協作、後優化」為主軸推進，並持續同步 PRD 需求 ID。

## Phases

### Phase 1: MVP (核心價值驗證)

- `ROAD-001`：完成 Supabase Auth 與 Project CRUD。
- `ROAD-002`：完成 API Bug Issue 建立流程（cURL 解析 -> Env 自動判斷 -> Response 儲存）。
- `ROAD-003`：完成 Issue 詳細頁與 `Copy as cURL`。

### Phase 2: Collaboration (協作優化)

- `ROAD-004`：完成 Issue 列表篩選（Status、Environment）。
- `ROAD-005`：完成 Issue 狀態流轉（`Open` -> `In Progress` / `Done` / `Close`）。
- `ROAD-006`：完成即時通知系統（DB Trigger + Realtime 前端整合）。
- `ROAD-007`：完成邀請碼註冊與角色控管。
- `ROAD-008`：完成專案成員權限區分（Owner / Member）。

### Phase 2.5: Invitation Enhancement（已完成）

- `ROAD-009`：完成專案 Email 邀請與通知中心邀請回應。
- `ROAD-010`：完成專案成員管理頁（成員管理、邀請記錄、移除成員）。
- `ROAD-011`：完成 `project_invite` 通知類型與邀請回應 Modal。

### Phase 2.7: Issue Type（已完成）

- `ROAD-012`：`issues` 新增 `issue_type`，支援 `api_bug` / `task`。
- `ROAD-013`：拆分 `ApiBugForm` 與 `TaskForm`。
- `ROAD-014`：Issue 列表新增類型 Tab 並同步 URL query。
- `ROAD-015`：Issue 詳細頁依類型差異化顯示。
- `ROAD-016`：Server 端拒絕 Task 類型更新 API 專屬欄位。

### Phase 3: Polish (體驗升級)

- `ROAD-017`：補齊專案層級環境變數對應設定。
- `ROAD-018`：新增留言評論功能（Comments）。
- `ROAD-019`：優化 Loading State 與 Error Handling。

## Cross-References

- 功能需求主體：見 [auth.md](./auth.md)、[projects.md](./projects.md)、[issues.md](./issues.md)、[notifications.md](./notifications.md)。
