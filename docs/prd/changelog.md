# PRD Changelog

## 2026-03-09 - v2.3

- `DOC-018`：修正 [cli-integration.md](./cli-integration.md) `TOKEN-003` prefix 範例長度（`ct_a1b2c3d` → `ct_a1b2c3de`，符合 11 碼），同步修正 [data-model.md](./data-model.md) `api_tokens` 表範例。
- `DOC-019`：修正 [cli-integration.md](./cli-integration.md) Friendly ID 解析邏輯，釐清 `-` 後數字為 `issueNumber` 而非 `issueId`；新增 `CLI-045`、`CLI-046` 定義 issueNumber 查詢需求與 API endpoint 支援。
- `DOC-020`：新增 [cli-integration.md](./cli-integration.md) `TOKEN-SEC-005`，定義 auth middleware `authMethod` 標記機制，確保 Token 管理 API 拒絕 token-based 存取。
- `DOC-021`：新增 [cli-integration.md](./cli-integration.md) `TOKEN-031`，補充 `unauthorized()` helper 需求。
- `DOC-022`：修正 [cli-integration.md](./cli-integration.md) `CLI-008`，新增 kebab-case alias 支援（`in-progress` → `In Progress`）。
- `DOC-023`：新增 [cli-integration.md](./cli-integration.md) `CLI-044`，定義 `--env, -e` 環境篩選選項。
- `DOC-024`：修正 [cli-integration.md](./cli-integration.md) `CLI-015`，補充 status 合法值驗證與 kebab-case alias 支援。

## 2026-03-09 - v2.2

- `DOC-015`：新增 [cli-integration.md](./cli-integration.md)，定義 API Token 系統（`TOKEN-*`）、CLI 工具（`CLI-*`）、Claude Code Skill（`SKILL-*`）三模組規格。
- `DOC-016`：更新 [README.md](./README.md) 文件導覽，新增 `cli-integration.md` 入口。
- `DOC-017`：更新 [data-model.md](./data-model.md)，新增 `api_tokens` 資料表定義與追蹤矩陣（`DATA-013`）。

## 2026-02-28 - v2.1

- `DOC-008`：對齊實作路由，將專案成員管理頁規格更新為 `/projects/[id]/members` 與 Members 入口命名。
- `DOC-009`：補齊專案建立表單 `environments` 必填規格，與前後端驗證一致。
- `DOC-010`：修正邀請狀態集合為 `pending/accepted/rejected/expired`，並標註 `rejected` 為保留擴充狀態。
- `DOC-011`：更新認證模組，移除 `/settings` 必要性，改為 Header 使用者選單（Theme/登出）。
- `DOC-012`：更新通知與資料模型文件，將 Issue 狀態變更通知 Trigger 標記為 `Planned`（尚未落地）。
- `DOC-013`：調整敏感欄位遮罩規格描述，改為「不得暴露原值」並對齊目前 UI 表現。
- `DOC-014`：校正資料模型欄位型別描述（`projects`、`notifications`）以符合 Drizzle schema。

## 2026-02-28 - v2.0

- `DOC-001`：將單一檔案 `docs/prd.md` 重構為模組化文件目錄 `docs/prd/`。
- `DOC-002`：新增入口檔 [README.md](./README.md) 作為統一索引與導覽。
- `DOC-003`：功能需求拆分為四個模組文件：`auth.md`、`projects.md`、`issues.md`、`notifications.md`。
- `DOC-004`：資料模型、非功能需求、Roadmap 各自獨立成檔。
- `DOC-005`：導入需求唯一 ID 規範（`AUTH-*`, `PROJ-*`, `ISSUE-*`, `NOTIF-*`, `DATA-*`, `NFR-*`, `ROAD-*`）。
- `DOC-006`：新增需求追蹤矩陣（Requirement ID -> Data Objects）。
- `DOC-007`：`docs/prd.md` 保留為相容入口，指向新文件目錄。

## 2026-02-28 - v1.5

- 單一檔案版本，集中紀錄產品需求、資料庫設計、非功能需求與 Roadmap。

---

## 編輯規範

- 每次 PRD 調整需新增 changelog 條目。
- 條目格式建議：日期、版本、需求 ID、變更摘要、影響檔案。
