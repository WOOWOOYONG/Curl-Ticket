## Context

`packages/cli/` 已透過 `init-skill` 安裝一支 `curl-ticket-issue-analyzer` SKILL.md，該 Skill 是純 Markdown 指令文件，不含程式碼，靠 Claude Code 等 host 解讀並驅動 CLI。本次新增 `curl-ticket-create-task` 採用相同形態：**沒有任何 TS 邏輯落在 CLI runtime**，純粹靠 SKILL.md 描述對話流程，並重用既有 `projects` / `members` / `create-issue` 三個 CLI 子指令。

`init-skill` 目前位於 `packages/cli/src/commands/init-skill/`，內含 `agents.ts`、`file-ops.ts`、`prompts.ts`、`transform.ts`、`index.ts`。從目錄結構推斷它已預期會處理多個 agent/skill；本次只需把新 skill 納入安裝清單即可，不應重構既有抽象。

## Goals / Non-Goals

**Goals:**
- 提供結構化（Why / Acceptance Criteria）且摩擦最低的「建立 Task」流程
- 與 `curl-ticket-issue-analyzer` 共存，職責清楚分離（一支讀/分析、一支寫）
- 沿用 `--json` 輸出與 exit code 慣例，錯誤處理一致
- 隨 `init-skill` 安裝，無須使用者手動 copy 檔案

**Non-Goals:**
- 不處理 `api_bug`（cURL 解析流程已由其他 Skill / UI 涵蓋）
- 不在 CLI runtime 加 `--interactive` 模式
- 不修改 `create-issue` 指令的旗標、行為、輸出格式
- 不引入新的 CLI 依賴（不用 `inquirer` 等套件，互動全靠 host 的 AskUserQuestion）

## Decisions

### D1. Skill 與 CLI `--interactive` 並存

選擇：**雙軌並存**——Skill（host-driven，使用 `AskUserQuestion`）與 `curl-ticket create-issue --interactive`（CLI-driven，使用 `@inquirer/prompts`）同時提供，共用同一份 description 樣板與欄位驗證規則。

理由：
- 兩種使用情境真實存在：在 Claude Code 內希望「自然語言對話」、在純 terminal 希望「不離開 shell」
- `@inquirer/prompts` 已是 CLI 既有 dependency（`packages/cli/package.json`），不引入新套件
- 共用樣板（D3）與 assignee 解析（D2 step 5）可避免雙軌行為漂移
- Skill 不被 `tsup` 編進 dist，純檔案 copy；`--interactive` 只是 `create-issue.ts` 內多一條分支

雙軌一致性如何保證：
- Description 樣板放在 `packages/cli/src/templates/task.md`，**Skill 與 CLI 都引用同一份**（Skill 在 SKILL.md 內 inline 一份摘要 + 指向 CLI 樣板路徑）
- 欄位驗證規則寫成 `packages/cli/src/commands/create-issue/validators.ts`，`--interactive` 直接 import；Skill 的對等規則寫進 SKILL.md，並在註解標註「對應 validators.ts」
- 任一邊新增必填欄位時，PR 必須同時更新兩處（在 PR template 不額外加，靠 spec 與 review 把關）

### D1a. `--interactive` 與既有旗標的互動

`create-issue` 既有旗標：`--type`、`--curl`、`--title`、`--description`、`--assignee`、`--json`、`--dry-run`（若有）。

規則：
- `--interactive` 只在 `--type task` 下啟用（v1）；搭配 `--type api_bug` 直接報錯，建議使用者用既有旗標或 Skill 的 cURL 流程
- 使用者若同時帶 `--title` / `--description` / `--assignee`：以這些值為**預設答案**，互動仍會逐題詢問（pre-fill 模式），方便 retry
- `--from-template <name>` 與 `--description` 互斥；同時出現報錯
- `--interactive` 不支援 `--json`（互動模式輸出給人看）；同時帶兩個旗標報錯
- 互動完成後仍走原本的 `createIssue()` API client function，**不複寫 mutation 邏輯**

### D1b. Mode Detection（Step-by-step vs Fast Path）

Skill 支援兩種輸入模式，**由規則決策樹決定**，不交給 LLM 自由判斷：

**Layer 1 — 明確關鍵字覆寫**
- Force Fast Path：`from this PRD`、`parse this`、`依這份`、`根據以下`、`直接建`、`skip questions`
- Force Step-by-step：`step by step`、`one by one`、`逐題`、`問我`

**Layer 2 — 結構訊號**（無關鍵字時）
- Step-by-step：訊息僅含觸發句（≤ 2 行），無 Markdown 結構
- Fast Path 候選：≥ 3 行 **或** 含 Markdown heading / bullet list / requirement ID 模式 `[A-Z]+-\d+(\.\d+)*`

**Layer 3 — 欄位可抽取性**（Fast Path 候選才執行）
抽取規則：
- `title`：第一個 `#` / `##` heading；否則第一句話（截斷至 200 字）
- `why`：`## Why` / `## Background` / `## 動機` / `## 為什麼` 段落；否則第一段非 heading 文字
- `acceptance_criteria`：`## Acceptance` / `## AC` / `## Done` / `## 驗收` / `## Requirements` 段落；否則文中第一個 bullet list
- `references`（選用）：掃描全文收集 `[A-Z]+-\d+(\.\d+)*` 出現的 ID

判定：
- 三欄位（title / why / AC）全抽到 → **Fast Path**
- 部分抽到 → `AskUserQuestion` 一次：「使用 auto-derived 值還是逐題？」
- title 或 why 抽不到 → 退回 **Step-by-step**，把貼上的文字作為每題 hint

**Project 與 Assignee 永遠不會 auto-derive**，除非：
- Project：`curl-ticket projects --json` 只回 1 個；或文字明確含 project key 且能對到清單
- Assignee：文字含 `@<name>` 或 `assign to <name>` 模式

理由：Fast Path 與 Step-by-step 的 mutation 路徑相同，差別只在欄位填入方式；Preview gate 是兩者共用的最終護欄，所以 Mode Detection 即使誤判也不會造成錯誤的 mutation。寫死規則而非交給 LLM 自由判斷，確保兩個 host（Claude Code / Codex）行為一致、可寫成 spec scenario 可驗證。

### D2. 問答順序與欄位

固定 5 步，**逐題**用 `AskUserQuestion`：

1. **Project**：先 `curl-ticket projects --json`。若 0 個 → 終止並提示先建 project；1 個 → 直接採用、跳過此題；≥2 個 → 以 `name (KEY)` 為 option、`projectId` 為 value，open-ended 允許貼 ID。
2. **Title**：open-ended，必填，trim 後長度 1–200（與 `createIssueSchema` 對齊）。
3. **Why**：open-ended，建議 1–3 句，允許空字串但不建議。
4. **Acceptance Criteria**：open-ended，提示「每行一條，- 開頭可省略」；Skill 端負責正規化成 bullet list。
5. **Assignee**：open-ended，預設 `me`。輸入 `none` / `null` → 不指派；輸入 email/uuid → 直接帶入；輸入名字 → 走 `curl-ticket members <projectId> --json`，比對 `name`（fallback email local-part），多筆則回頭問使用者選擇。

理由：問題順序按「定位 → 內容 → 指派」由廣到細；Why/AC 拆兩題比一次塞長表單更穩定，AC 結構化也方便日後 Done-criteria 驗收。

### D3. Description 樣板與 `--from-template`

樣板存放：`packages/cli/src/templates/<name>.md`，v1 只提供 `task.md`：

```
## Why
{{why}}

## Acceptance Criteria
{{acceptance_criteria}}

## Notes
{{notes}}
```

`{{var}}` 是純文字 placeholder（不引入 templating 套件，自寫 `String#replaceAll`）。空值處理：
- `why` 留空 → 替換成 `_(not provided)_`
- `acceptance_criteria` 留空 → 整個 section（heading + body）連同前一個 blank line 移除
- `notes` 留空 → 同上移除

`--from-template <name>` 行為：
- 不帶 `--interactive`：印出已替換 placeholder 為空的樣板字串到 stdout，使用者可重導向到檔案再用 `--description "$(cat ...)"`；或直接寫成 `--description` 的預設值（取決於 `--print-only` 旗標，v1 採前者，避免破壞既有單機呼叫）
- 帶 `--interactive`：把樣板內容拆解到對應問題作為預設答案

對齊：Skill 在 SKILL.md 內 inline 同樣的樣板字串並標註「source of truth: `packages/cli/src/templates/task.md`」，避免 host 解析失敗時還能 fallback。

理由：與 `curl-ticket-issue-analyzer` 既有 SKILL.md 範例 (`--description "## Why\n..."`) 對齊；站台 issue 詳情頁已支援 Markdown 渲染；單一檔案來源讓 Skill / CLI / 人手三條路徑都看同一份。

### D4. Preview / Confirm gate

送出前用 `AskUserQuestion` 顯示組好的 title + description preview，三個選項：`Confirm` / `Edit` / `Cancel`。`Edit` 退回詢問要改哪一欄，重新流程；`Cancel` 直接結束、不呼叫 CLI。

Fast Path 路徑下，Preview **必須**標註資料來源，例如：

```
[Auto-derived from your message]
Title: <抽到的標題>
---
<rendered description>
---
Project: <name> (<key>)
Assignee: <resolved>
```

理由：建立 Task 是 mutation，且 `create-issue` 沒有 `--dry-run`（目前只有 `update-status` 與 `assign` 支援），由 Skill 層補一道確認最便宜。Fast Path 把 Preview 從「最後確認」升格為「Mode Detection 的安全網」，標註來源讓使用者一眼看出哪些是 Agent 推導的。

### D5. `init-skill` 安裝策略

把新 skill 加入既有清單，沿用目前 prompt（互動式選 / 全選），**不**自動覆寫使用者既有檔案；若目的地已存在，提示 overwrite/skip。

理由：保留使用者可能的客製化；行為與多數 scaffolder 一致。

## Risks / Trade-offs

- **[Host 相依]** Skill 仰賴 host 提供 `AskUserQuestion`。非 Claude Code 環境（純 CLI）跑不起來 → Mitigation: SKILL.md 標註「需 AI host」，並在 README 同步說明；未來若要支援，再導入 D1 替代方案。
- **[名字解析歧義]** 同名 member 多筆時需 round-trip 給使用者選擇，會中斷流程 → Mitigation: members 列表先排序、顯示 email，並在 SKILL.md 明示處理流程（已沿用 `curl-ticket-issue-analyzer` 的規則）。
- **[Schema drift]** 未來 `createIssueSchema` 若新增必填欄位，Skill 不會自動跟上 → Mitigation: SKILL.md 開頭沿用「先跑 `curl-ticket schema`」慣例；長期可在 CLI 暴露 `create-issue --print-required-fields` 之類，但本次不做。
- **[Token 消耗]** members 列表大時會吃 context → Mitigation: `--json` 已是最精簡輸出；如未來成痛點，再考慮 CLI 加 `--search <query>`。
- **[雙軌漂移]** Skill 與 `--interactive` 同步維護成本 → Mitigation: 樣板 (`templates/task.md`) 與驗證 (`validators.ts`) 單一檔案來源；spec scenario 同時涵蓋兩條路徑，CI typecheck/lint 抓掉一邊忘改的問題。
- **[`--interactive` 與 `--json` 衝突]** 互動輸出非結構化會破壞 agent 用法 → Mitigation: 同時帶兩旗標即報錯（exit code 4）。

## Migration Plan

無資料遷移。發佈步驟：

1. 在 feature branch 完成檔案新增 + `init-skill` 更新
2. 合併到 main 後，`packages/cli` 跑 `npm version minor`（新增功能屬 minor）
3. push tag `cli@x.y.z`，CI 自動發佈到 npm
4. 既有使用者執行 `curl-ticket init-skill` 即可取得新 skill；舊 skill 不受影響

回滾：若發現問題，下一個 patch 版本將 init-skill 清單中的 `curl-ticket-create-task` 拿掉，並從 `packages/cli/skills/` 刪除目錄；npm 不 unpublish。

## Open Questions

1. 是否在 `init-skill` 提供「全部安裝」與「逐支選擇」兩種模式？依現有 `prompts.ts` 行為決定，實作時對齊現況即可。
2. SKILL.md 的撰寫語言：與 `curl-ticket-issue-analyzer` 一致採英文，僅在 user-facing 提示上保留中英雙語？傾向**全英**保持 host 解析穩定，問答中若使用者用中文，host 自然會以中文回覆。
3. `--from-template` 不帶 `--interactive` 時的輸出：v1 採「印到 stdout」方便 `$(...)` 重導向；若實測使用者更常想 `> file.md` 編輯後再貼，未必需要改設計，但要在 README 範例呈現。
4. 是否要讓 `templates/` 支援使用者自訂（讀 `~/.config/curl-ticket/templates/`）？v1 不做，先看內建樣板的反饋。
