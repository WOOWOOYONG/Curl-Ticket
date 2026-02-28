# 5. 非功能需求 (Non-Functional Requirements)

## Requirements

### 5.1 效能 (Performance)

- `NFR-001`：主要 API 平均回應時間目標 < 200ms。
- `NFR-002`：Realtime WebSocket 連線需具備斷線重連能力（可依賴 Supabase SDK 內建機制）。

### 5.2 安全性 (Security)

- `NFR-003`：所有寫入型 API 需通過 Zod Schema 驗證。
- `NFR-004`：註冊流程必須維持封閉制，僅有效邀請碼可完成註冊。
- `NFR-005`：Admin 能力必須由 Server 端 `requireAdmin()` 與前端路由限制雙重控管。
- `NFR-006`：`issues` 的 RLS 需限制為專案成員可讀寫。
- `NFR-007`：`notifications` 的 RLS 需限制為 `auth.uid() = user_id`。
- `NFR-008`：UI 呈現 Request Headers 時，`Authorization` 等敏感欄位需遮罩。

### 5.3 相容性 (Compatibility)

- `NFR-009`：支援 Chrome、Edge、Safari、Firefox 最新版。

### 5.4 開發體驗 (Developer Experience)

- `NFR-010`：專案維持 TypeScript Strict Mode。

## Cross-References

- 資料安全與約束：見 [data-model.md](./data-model.md) 的 `DATA-006`、`DATA-007`、`DATA-008`。
