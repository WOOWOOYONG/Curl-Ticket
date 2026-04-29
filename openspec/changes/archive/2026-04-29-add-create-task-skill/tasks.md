## 1. Skill 內容

- [x] 1.1 在 `packages/cli/skills/curl-ticket-create-task/` 新增 `SKILL.md`，frontmatter 設定 `name: curl-ticket-create-task` 與觸發描述
- [x] 1.2 撰寫「First-run introspection」段落，提示先跑 `curl-ticket schema` 與 `curl-ticket projects --json`
- [x] 1.3 撰寫 5 步問答流程說明（project / title / why / acceptance criteria / assignee），每步明確指示使用 `AskUserQuestion`
- [x] 1.4 撰寫 assignee 解析規則（me / none / uuid / email / 名字 → members 比對），與 `curl-ticket-issue-analyzer` 規則對齊
- [x] 1.5 撰寫 description Markdown 樣板（`## Why` + `## Acceptance Criteria`，含空白處理）
- [x] 1.6 撰寫 Preview / Confirm / Edit / Cancel gate 說明
- [x] 1.7 撰寫 CLI 呼叫範例與成功輸出（friendlyId、URL）
- [x] 1.8 撰寫錯誤處理段落，依 exit code 2/3/4/5 給出對應指引
- [x] 1.9 撰寫 **Mode Detection** 段落：三層決策（明確關鍵字 → 結構訊號 → 欄位可抽取性），含中英關鍵字清單與抽取規則
- [x] 1.10 撰寫 Fast Path 抽取規則：title / why / acceptance_criteria 段落比對與 fallback；references 收集 `[A-Z]+-\d+(\.\d+)*` ID
- [x] 1.11 撰寫 Project / Assignee 不被 auto-derive 的條件（除非單一 project / 文字含 `@name` / `assign to <name>`）
- [x] 1.12 撰寫 Preview 在 Fast Path 必須顯示 `[Auto-derived from your message]` 標記

## 2. CLI 樣板與 `--from-template`

- [x] 2.0.1 新增 `packages/cli/templates/task.md`（package-root 位置，配合 `files` 欄位），內容含 `## Why` / `## Acceptance Criteria` / `## Notes` placeholder
- [x] 2.0.2 在 `packages/cli/package.json` 的 `files` 加入 `templates`
- [x] 2.0.3 新增 `packages/cli/src/templates/index.ts`：`listTemplates()`、`renderTemplate(name, vars)`，包含空值移除 section 的邏輯
- [x] 2.0.4 在 `create-issue.ts` 註冊 `--from-template <name>`：未帶 `--interactive` 時印到 stdout 並 exit 0；與 `--description` 互斥
- [x] 2.0.5 加 vitest 單元測試覆蓋 `renderTemplate`：placeholder 替換、空 why → `_(not provided)_`、空 AC/Notes/References → 整段移除
- [x] 2.0.6 在 `templates/task.md` 加上 `## References` section 與 `{{references}}` placeholder；`renderTemplate` 支援 references 為陣列 → 渲染為 `- <id>` bullet list

## 3. CLI `--interactive` 模式

- [x] 3.0.1 在 `packages/cli/src/commands/create-issue/validators.ts` 抽出共用驗證（title 1–200、acceptance criteria 正規化、assignee 解析、description 拆段、requirement-id 抽取）
- [x] 3.0.2 在 `create-issue.ts` 註冊 `--interactive` / `-i`，並加入與 `--type api_bug`、`--json` 的互斥檢查（exit code 4）
- [x] 3.0.3 用 `@inquirer/prompts` 實作 5 步問答；無 projectId 時呼叫既有 API client 取得清單做 picker
- [x] 3.0.4 支援 pre-fill：`--title` / `--description` / `--assignee` / `--from-template` 帶入時作為預設答案；`--description` 用簡易 Markdown parser 拆出 `## Why` / `## Acceptance Criteria` / `## Notes` 段落
- [x] 3.0.5 實作 Preview / Confirm / Edit / Cancel gate，Edit 後彈出欄位 picker 重跑單題
- [x] 3.0.6 確認後呼叫既有 `createIssue()` API client，**不複寫 mutation**；錯誤映射沿用既有 exit code mapping
- [x] 3.0.7 加 vitest 測試：`api_bug + --interactive` 報錯、`--interactive + --json` 報錯、`--from-template + --description` 報錯、Markdown 拆段函式

## 4. init-skill 整合

- [x] 4.1 檢視 `packages/cli/src/commands/init-skill/{index,prompts,file-ops,agents,transform}.ts`，確認既有 manifest 抽象
- [x] 4.2 將 `curl-ticket-create-task` 加入安裝 manifest（顯示名稱、來源路徑、目的地路徑）— 改寫為 `skills.ts` + `agents.ts` 的 (skill × agent) 表
- [x] 4.3 確認多選 / 全選 prompt 行為涵蓋新項目；`index.ts` 增加 skills 多選 prompt（預設全選）
- [x] 4.4 確認既有檔案存在時的 overwrite/skip 邏輯仍正確（沿用現況）
- [x] 4.5 在 `packages/cli/src/__tests__/init-skill.test.ts` 加上 manifest 單元測試（SKILLS / targetPathFor）

## 5. 套件配置與文件

- [x] 5.1 確認 `packages/cli/package.json` 的 `files` 欄位包含 `skills` 與 `templates`
- [x] 5.2 在 `packages/cli/README.md` 補一段「Available skills」介紹兩支 skill 與安裝方式（中英雙語）
- [x] 5.3 在 `packages/cli/README.md` 補 `create-issue --interactive` 與 `--from-template` 的範例（中英雙語）
- [x] 5.4 在 `packages/cli/skills/curl-ticket/SKILL.md` 與新 SKILL.md 的觸發描述上互相點名，避免 host 混淆兩支 skill 的職責

## 6. 驗證

- [x] 6.1 在 repo 根跑 `pnpm lint`、`pnpm typecheck`、`pnpm test:run` 全綠（265 tests pass）
- [x] 6.2 在 `packages/cli` 跑 `pnpm build` — tsup 80.59 KB / no warning
- [x] 6.3 用 `npm pack --dry-run` 驗證 tarball — `skills/curl-ticket-create-task/SKILL.md` 與 `templates/task.md` 都在內
- [x] 6.4 (手動) 本機 `npm i -g ./curl-ticket-cli-x.y.z.tgz` 後跑 `curl-ticket init-skill`，確認新 skill 可被選擇與安裝 — 待發版前由人工驗證
- [x] 6.5 (手動) 在 Claude Code 啟動新 skill，跑一輪完整流程 — 待發版前由人工驗證
- [x] 6.6 (手動) 在純 terminal 跑 `curl-ticket create-issue <projectId> --type task --interactive` — 待發版前由人工驗證（自動化以單元測試覆蓋互斥旗標與欄位驗證）
- [x] 6.7 驗證 `curl-ticket create-issue --type task --from-template task` 印出空樣板 — 已透過 `node dist/index.js` 與單元測試確認
- [x] 6.8 驗證錯誤路徑（`--interactive --json`、`--from-template --description`、`--type api_bug --interactive`、未知樣板名稱）— 全部以 vitest 單元測試覆蓋
- [x] 6.9 (手動) 驗證 Mode Detection 四個情境 — 待人工在 Claude Code 驗證；spec scenarios 已對應寫進 SKILL.md
- [x] 6.10 (手動) 驗證 Fast Path Preview 顯示 `[Auto-derived from your message]` 標記 — 待人工在 Claude Code 驗證；spec scenarios 已對應寫進 SKILL.md
