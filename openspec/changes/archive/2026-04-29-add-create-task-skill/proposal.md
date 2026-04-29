## Why

目前 CLI 已支援 `curl-ticket create-issue --type task`，但 end user（與 AI agent）需要自己組裝 title、description Markdown、解析 assignee 等步驟，門檻偏高、輸出品質也不一致。仿 `openspec-propose` 提供一支互動式 Skill，能引導使用者依固定格式逐題回答後自動建立 Task，可以大幅降低建立 Task 的摩擦並讓內容結構統一（## Why / ## Acceptance Criteria）。

## What Changes

- 新增 Skill `curl-ticket-create-task`，放在 `packages/cli/skills/curl-ticket-create-task/SKILL.md`
- Skill 支援兩種模式：**Step-by-step** 透過 `AskUserQuestion` 依序詢問 project → title → why → acceptance criteria → assignee；**Fast Path** 從使用者貼上的 PRD / 設計文件文字中自動抽取欄位後直接進入 Preview。模式選擇由 **Mode Detection** 決策樹決定（明確關鍵字 → 訊息結構 → 欄位可抽取性三層判斷）
- 不論模式，Project（從 `curl-ticket projects --json` 動態載入）與 Assignee（預設 `me`，名字走 `curl-ticket members <projectId> --json` 解析）的解析規則一致
- 收齊回覆後組裝 Markdown description（含可選 `## References` section，從文字中偵測 `[A-Z]+-\d+` 之類的 requirement ID），顯示 preview，並在使用者確認後呼叫 `curl-ticket create-issue --type task --json` 建立
- 建立成功後輸出 `friendlyId`（CT-XX）與站台 URL
- 更新 `packages/cli/src/commands/init-skill/`，使 `curl-ticket init-skill` 一併安裝這支新 Skill
- **CLI 端優化 1：** `curl-ticket create-issue --interactive` — 用 `@inquirer/prompts`（已是 CLI dependency）內建相同 5 步問答，讓沒有 AI host 的使用者也能在純 terminal 跑完整流程
- **CLI 端優化 2：** `curl-ticket create-issue --from-template <name>` — 預先 stub description 樣板（task 樣板含 `## Why` / `## Acceptance Criteria` / `## Notes`），讓 Skill 與 `--interactive` 共用同一份樣板，減少漂移
- 不修改後端 API，也不修改 `create-issue` 既有非互動旗標的行為（純新增旗標）

### Non-goals

- 不支援 `api_bug` 類型的互動模式（本次 `--interactive` 與 Skill 只處理 task）
- 不改變既有 `curl-ticket-issue-analyzer` Skill 的行為
- 不新增前端 UI 或後端 endpoint

## Capabilities

### New Capabilities

- `cli-create-task-skill`: 互動式 Skill 規範——觸發條件、問答順序、欄位驗證、description 樣板、preview/確認流程、CLI 指令組裝、錯誤處理（依 CLI exit code）
- `cli-init-skill-bundle`: `init-skill` 指令安裝多支 skill 的行為（清單、覆寫策略、安裝目的地）
- `cli-create-issue-interactive`: `curl-ticket create-issue --interactive` 純 CLI 互動模式的問答流程、欄位驗證、preview 確認、與既有非互動旗標的關係
- `cli-issue-description-template`: `--from-template` 旗標的樣板註冊機制與 task 樣板內容（與 Skill 共用）

### Modified Capabilities

（無——本變更不調整既有 spec 的需求）

## Impact

- 受影響檔案：
  - `packages/cli/skills/curl-ticket-create-task/SKILL.md`（新增）
  - `packages/cli/src/commands/init-skill/`（更新安裝清單）
  - `packages/cli/src/commands/create-issue.ts`（新增 `--interactive`、`--from-template`）
  - `packages/cli/src/templates/`（新目錄，存放 description 樣板）
  - `packages/cli/package.json`（`files` 欄位若需新增路徑）
  - `packages/cli/README.md`（補充新 skill 與旗標說明）
- PRD 模組：本變更僅涉及 CLI/Skill 工具鏈，不需更新 `docs/prd/auth.md`、`issues.md` 等模組
- 依賴：無新套件；沿用 `curl-ticket projects | members | create-issue` 既有指令
- 發佈：透過既有 CLI tag (`cli@x.x.x`) 流程隨下一版 npm publish
