# PRD Changelog

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
