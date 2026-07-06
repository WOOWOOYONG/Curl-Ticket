# Curl Ticket 架構審查報告

- **審查日期**：2026-07-06
- **審查範圍**：`server/`、`app/`、`shared/`、`packages/cli/` 全部原始碼
- **部署脈絡**：Nuxt app（含 server routes）部署於 Vercel serverless，資料庫與 Auth 使用 Supabase；CLI 發布至 npm 但僅內部使用
- **性質**：審查報告 + 修正進度追蹤（勾選代表已於程式碼落實）

---

## 0. 修正進度追蹤

> 勾選規則：`[x]` = 已修改並提交、`[ ]` = 尚未處理。子項全勾才視為該項完成。
> 最近更新：2026-07-06

### P0

- [x] **A. 收斂錯誤處理層**
  - [x] `errors.ts`：訊息改放 `message`，`statusMessage` 只放 ASCII reason phrase
  - [x] 新增 `server/utils/validate.ts`（`validate` / `validateBody` / `validateQuery`）
  - [x] 全部 `server/api/**` 改用驗證封裝，消滅五種驗證寫法（含 `projects/index.get.ts` 由 raw `.parse()` 改回 400）
  - [x] `internalServerError()` 不再把 raw error 塞進 `data`，改為 server-side log
  - [x] `curl/parse.post.ts` 回固定訊息「Invalid cURL command」
  - [x] `middleware/auth.ts` 改用 `unauthorized` / `forbidden` helper
  - [x] 前端統一改讀 `error.data?.message`：`IssueForm.vue`、`projects/[id]/edit.vue`、`projects/create.vue` 已補上 `fetchError.data?.message`（Codex 指出）
- [x] **C. 修正 useFetch key 與快取失效**
  - [x] `useIssues` / `useProject` / `useComments` / `useProjectMembers` key 含參數
  - [x] `members.vue` 改用 `useProjectMembers`，移除自建 fetch 與重複型別
  - [x] 快取失效收斂
- [x] **D. 補齊 transaction 與併發防護**
  - [x] `comments.post.ts` 留言 + 通知包進 transaction
  - [x] `profile.delete.ts` 清理 + 軟刪除包進 transaction
  - [x] `project_invitations` 加 partial unique index（`projectId + email WHERE status='pending'`）
  - [x] migration 建立唯一索引前，先清理既有重複 pending 邀請（每組保留最新一筆、其餘標記 expired；Codex 指出）
- [x] **H. Serverless DB 連線設定**
  - [x] `db.ts` 加上 `max: 1` / `idle_timeout` / `connect_timeout`

### P1

- [ ] **B. CLI 型別改為從 shared 推導**
- [ ] **E. 貫徹 access helper + RLS 現狀文件化**
- [ ] **F. 表單驗證單軌化**

### P2

- [ ] **G. 抽出 handler 業務邏輯 + 首批服務層測試**
- [ ] 回應 envelope 統一
- [ ] 死碼清理（`app/types/database.types.ts`、`app/mocks/curl-examples.ts`）
- [ ] 過期邀請 write-on-read 抽成 `expireStaleInvitations()`
- [ ] CLI 小項（`--json` helper、`GET .../comments/:commentId`）
- [ ] HTML 處理收斂到 shared

---

## 1. 架構總評

1. **基礎分層是健康的**：Zod schema 集中在 `shared/`、access-control 抽成 `project-access.ts`、回應投影抽成 `protected-issue.ts`、error helper 統一 —— 「正確的骨架」都已存在。主要問題不是缺乏模式，而是**模式沒有被貫徹**：同一件事常有 2~5 種寫法並存。
2. **最大的結構性風險在 CLI**：`packages/cli/src/types.ts` 以約 20 個手寫 interface 鏡像 API 回應，與 `shared/schemas` 的 `z.infer` 型別零連結，已出現實際 drift（`#shared` build alias 已接好，卻只拿來 import constants）。
3. **錯誤處理層有資訊外洩與正確性問題**：raw DB error、第三方套件錯誤訊息、Zod internal issues 都會流到 client；使用者訊息放在 HTTP `statusMessage`（含中文）是脆弱的設計。
4. **前端資料層的快取正確性靠運氣**：`useFetch` 的 key 不隨參數變化、快取失效用 `clearNuxtData` 手動散落在元件裡、同一資源有兩條平行的 fetch 實作共用同一個 key。
5. **可測試性斷層明顯**：有測試的恰好都是「已抽出的 utils」（4/14），路由 handler 內的業務邏輯（issue 建立重試迴圈、PATCH 通知邏輯、邀請前置檢查）全部未測 —— 測試覆蓋的邊界就是模組抽取的邊界，證明抽取本身就是提升測試性的正確路徑。

---

## 2. 主要問題（依影響程度排序）

### 問題 A｜錯誤處理層外洩內部資訊、且驗證失敗行為不一致（正確性 + 安全）

- `server/api/projects/[projectId]/issues/index.post.ts:104` 與 `server/utils/public-sharing.ts:106` 把 raw DB error 當 `data` 傳給 `internalServerError()`，`createError` 會將其序列化回 client。
- `server/api/curl/parse.post.ts:27` 直接把 `curlconverter` / `JSON.parse` 的 `err.message` 回給 client。
- 十多條路由把 `result.error.issues`（Zod 內部結構）原樣回傳。
- `server/api/projects/index.get.ts:13` 用 raw `.parse()`，驗證失敗會變成 **500** 而非 400 —— 與其他所有路由不一致。全專案共存五種驗證寫法（`safeParse` + issues、raw `.parse()`、`readValidatedBody`、`safeParse` + 首條訊息、純手動檢查）。
- `server/utils/errors.ts` 把使用者訊息放進 `statusMessage`（HTTP reason phrase）。`server/middleware/auth.ts:113` 的 `forbidden('請先完成註冊')` 會把非 ASCII 字元放進 status line，部分 proxy/HTTP2 環境會剝除或報錯；正式做法是訊息放 `message`/`data`。

### 問題 B｜CLI 手抄 API 回應型別，已產生 drift（模組邊界 + 型別設計）

`packages/cli/src/types.ts`（207 行、約 20 個 interface）與 server 契約無任何編譯期連結：

- CLI 的 `Project` 多了 shared schema 沒有的 `lastUpdated` 欄位，`environments` 退化成 `string[]`（`types.ts:3-14` vs `shared/schemas/project.ts:33-47`）。
- `MyIssueItem`、`Pagination` 等是 shared 型別的逐欄複本。
- `tsup.config.ts:11-15` 的 `#shared` alias 已能在 build 時 inline shared 原始碼 —— 基礎建設已就緒，只是沒用。
- 每次 server 加欄位，CLI 要手動同步三處（`types.ts`、`constants.ts:65-89` 的 `ISSUE_FIELDS`、exhaustiveness assert）。
- 相關：`shared/schemas/me-issues.ts:36-68` 的回應型別是手寫 interface 而非 Zod 推導，本身就不是 schema-backed。

### 問題 C｜前端 useFetch 快取 key 設計錯誤（資料流正確性）

- `app/composables/useIssues.ts:58`：key 是 `projectId.value` 在 setup 時算一次的**靜態字串**，且**不含任何 filter/分頁參數** —— 所有篩選組合共用一個 payload cache entry，URL 卻是響應式的。切換篩選後返回、或 SSR payload 還原時可能拿到錯誤資料。
- `useProject`、`useComments`、`useProjectMembers` 同樣是 key 算一次、無 `watch`。
- `app/pages/projects/[id]/members.vue:28-31` 繞過 `useProjectMembers` 自己寫 `useFetch`，**用同一個 cache key**，且宣告了一份與 `shared/schemas/project.ts:50-55` 不一致的 `ProjectMember`（`email: string` vs `nullable`）—— 同名型別兩份定義並存。
- 快取失效靠手動 `clearNuxtData` 散落在 `IssueForm.vue:263-268`、issue 詳情頁、`projects/[id]/edit.vue:78` 等處，新增 mutation 時容易漏。

### 問題 D｜寫入一致性：缺 transaction 與 TOCTOU（資料流)

- `comments.post.ts:33-61`：留言 insert 與通知 insert **未包 transaction**（issue 建立與邀請流程都有正確包，唯獨這裡漏了）。
- `auth/profile.delete.ts:37-45`：帳號刪除是 `Promise.all` 四個 delete + soft-delete，無 transaction，部分失敗會留下不一致狀態（`:36` 的註解與實際行為不符）。
- `invitations.post.ts:33-83`：成員存在檢查、pending 檢查都在 transaction 之外，且 `project_invitations` 無對應 unique constraint —— 併發邀請同一 email 會產生重複 pending。
- `tokens/index.post.ts:18-25`：「最多 5 個 token」是 count-then-insert，同樣有 race。

### 問題 E｜授權檢查有 helper 但未貫徹（模組邊界）

- `getAccessibleIssue`（`issue-access.ts:21-49`）只被 5 條 issue 路由中的 2 條使用；`[issueId].patch.ts`、`share.post.ts`、`share.delete.ts` 各自重新 parse 參數、重新載入。
- 「必須是 owner」的檢查（`project.ownerId !== userId`）在 6 個路由 handler 內各自 inline 重寫。
- `issue-access.getAccessibleIssue` 與 `comment-access.getProjectIssue` 是兩個重疊的 issue 載入 helper。
- Migration `0017_enable_rls_all_tables.sql` 對全部資料表**啟用了 RLS 但零 policy**。API 走 `DATABASE_URL` 直連角色本來就 bypass RLS，授權完全在 application layer。

### 問題 F｜表單驗證雙軌（型別設計）

`app/utils/validation.ts:54-79` 為了 i18n 訊息，把 `shared/schemas/issue.ts:95-100` 的 `createApiBugFormSchema`/`createTaskFormSchema` 整份重新定義一次。兩份 Zod schema 平行維護，規則改一邊不改另一邊時，前端放行、後端拒絕。

### 問題 G｜業務邏輯滯留在路由 handler，無法測試（測試性）

- `issues/index.post.ts`（108 行）、`issues/[issueId].patch.ts`（117 行）、`invitations.post.ts`（114 行）、`me/issues/index.get.ts`（131 行）的核心邏輯 inline 在 handler。
- Server utils 有測試的 4 個（`invitation-code`、`project-access`、`public-sharing`、`search`）恰好都是已抽出的模組；handler 內邏輯 0 測試、路由層 0 測試。
- CLI 端同理：`auth/device-flow.ts` 與 `index.ts` 的 `withAuth` 401 重試 / exit-code 對映完全未測。

---

## 3. 建議修改方案

### A. 收斂錯誤處理層（P0）

- **問題原因**：錯誤格式化分散在各 handler，各自決定洩漏什麼。
- **影響**：內部錯誤細節、schema 結構外洩；驗證失敗有時 400 有時 500。
- **建議改法**：
  1. `errors.ts` 改為訊息放 `message`，`statusMessage` 只放 ASCII reason phrase 或不設。
  2. 新增 `validateBody(event, schema)` / `validateQuery(event, schema)` helper：內部 `safeParse`，失敗時回 400 並把 Zod issues map 成 `{ field, message }` 白名單格式。全部路由改用它，一次消滅五種驗證寫法。
  3. `internalServerError()` 停止把 raw error 塞進 `data`，改為 server-side log。
  4. `curl/parse.post.ts` 回固定訊息「Invalid cURL command」。
- **需要修改的檔案**：`server/utils/errors.ts`、新增 `server/utils/validate.ts`、`server/api/**`（機械式替換，每條路由改動 3~5 行）、`server/middleware/auth.ts:90-94, 113`。

### B. CLI 型別改為從 shared 推導（P1）

- **問題原因**：`#shared` alias 只 import constants，DTO 全手抄。
- **影響**：server 契約變動時 CLI 無聲 drift（已發生）。
- **建議改法**：`types.ts` 逐個 interface 改為 `z.infer` re-export（或 `export type { Project } from '#shared/schemas'`），CLI 特有欄位用 intersection 補。zod 僅型別層 import，不進 bundle。同時把 `shared/schemas/me-issues.ts` 的手寫 interface 改為 Zod 推導。
- **需要修改的檔案**：`packages/cli/src/types.ts`、`shared/schemas/me-issues.ts`、`shared/types/pagination.ts`。
- **備註**：已確認 CLI 僅內部使用，`--json` 輸出格式無外部相容性包袱，可放心修正型別（含移除 server 不存在的 `Project.lastUpdated`），走 minor version 即可。

### C. 修正 useFetch key 與快取失效（P0）

- **問題原因**：key 在 setup 時以 `.value` 求值一次，且不含查詢參數。
- **影響**：篩選/分頁間快取互相覆蓋、SSR payload 可能還原錯誤資料、`members.vue` 與 composable 的同 key 雙實作互踩。
- **建議改法**：
  1. `useFetch` 的 `key` 改為 computed/函式，把 projectId + 全部 options 序列化進 key；即可移除大部分手動 `watch`。
  2. `members.vue` 刪掉自建 fetch，改用 `useProjectMembers`；刪除 local `ProjectMember`，統一 import shared 版本。
  3. 散落的 `clearNuxtData` 收斂成每個 composable 匯出的 `invalidateXxx()` 函式。
- **需要修改的檔案**：`app/composables/useIssues.ts`、`useProject.ts`、`useComments.ts`、`useProjectMembers.ts`、`app/pages/projects/[id]/members.vue`、`app/components/IssueForm.vue:263-268`、issue 詳情頁。

### D. 補齊 transaction 與併發防護（P0）

- **問題原因**：部分多步寫入未包 txn；前置檢查在 txn 外且無 DB constraint 兜底。
- **影響**：孤兒資料（帳號刪除半途失敗不可接受）、重複 pending 邀請。
- **建議改法**：`comments.post.ts` 與 `profile.delete.ts` 包進 `db.transaction`（各約 10 行改動）；`project_invitations` 加 partial unique index（`projectId + inviteeEmail WHERE status='pending'`）並在 handler catch unique violation。
- **需要修改的檔案**：`server/api/projects/[projectId]/issues/[issueId]/comments.post.ts`、`server/api/auth/profile.delete.ts`、`server/database/schema/project-invitations.ts` + 一支 migration。

### E. 貫徹 access helper + RLS 現狀文件化（P1）

- **問題原因**：helper 存在但採用率低，owner 檢查 inline 重複 6 次。
- **影響**：新路由容易漏檢查；三條「載入 project+issue」路徑行為可能分歧。
- **建議改法**：
  1. 新增 `requireProjectOwner(db, projectId, userId)` 與 `parseProjectId(event)`。
  2. `[issueId].patch.ts`、`share.post/delete.ts` 改用 `getAccessibleIssue`；`comment-access.getProjectIssue` 改為呼叫 `issue-access` 的實作。
  3. RLS：**維持現狀即可**（RLS enabled + 零 policy = 封鎖所有非 API 的直接存取，例如有人拿 anon key 直打資料庫）。只需在 migration 或 CLAUDE.md 加註「RLS 僅用於封鎖非 API 直接存取，授權邏輯全在 application layer」，避免後人誤以為漏寫 policy。
- **需要修改的檔案**：`server/utils/project-access.ts`、`server/utils/route-params.ts`、`server/utils/comment-access.ts`、`server/api/projects/[projectId]/issues/[issueId].patch.ts`、`share.post.ts`、`share.delete.ts` 及 6 個 inline owner-check 路由、CLAUDE.md（RLS 註記）。

### F. 表單驗證單軌化（P1）

- **問題原因**：i18n 訊息需求導致整份 schema 複製。
- **影響**：前後端驗證規則 drift。
- **建議改法**：`app/utils/validation.ts` 改為基於 shared schema 客製訊息 —— 用 Zod error map 或以 shared schema 為基底 `.extend()` 只覆寫訊息，讓「規則」只有一份、「文案」在 client 疊加。
- **需要修改的檔案**：`app/utils/validation.ts`（規則來源改為 `shared/schemas/issue.ts`、`project.ts`）。

### G. 抽出 handler 業務邏輯 + 建立第一批服務層測試（P2）

- **問題原因**：核心寫入邏輯 inline，依賴 DB 才能執行。
- **影響**：目前 0 路由測試；重構這些 handler 沒有安全網。
- **建議改法**：不需要全面 service layer，只挑三個最複雜的抽成可注入 `DbOrTx` 的函式：`createIssue()`（含編號重試）、`updateIssue()`（含通知決策）、`createInvitation()`（含前置檢查）；用 Vitest + pglite（或測試 DB）補測。與現有 `public-sharing.ts` 的抽取風格一致，是延續而非新模式。
- **需要修改的檔案**：新增 `server/utils/issue-service.ts`（或併入現有 utils）、對應三條路由瘦身、新增測試檔。

### H. Serverless DB 連線設定（P0，一行改動）

- **問題原因**：部署在 Vercel serverless，每個 function instance 各自建連線；`postgres-js` 預設每個 client 最多 10 條連線。
- **影響**：流量上來時大量 instance 同時握連線，容易撞 Supabase pooler 連線上限。
- **建議改法**：

  ```ts
  const client = postgres(env.databaseUrl, {
    prepare: false,
    max: 1,            // serverless：每個 instance 一條就夠
    idle_timeout: 20,
    connect_timeout: 10
  })
  ```

  並確認 `DATABASE_URL` 使用 pooler 連線字串（port 6543）而非直連（5432）。
- **需要修改的檔案**：`server/utils/db.ts`。

### 其他小項（P2，順手清理）

- 刪除死碼：`app/types/database.types.ts`（276 行，零引用）、`app/mocks/curl-examples.ts`。
- 統一回應 envelope（`{ data }` vs raw vs `{ success }`）—— 建議在新增 `validate.ts` 時一併定調，存量路由漸進遷移。
- 「過期邀請」write-on-read 邏輯在 3 處重複（`invitations.post.ts:33-44`、`invitations.get.ts:23-32`、`notifications/index.get.ts:23-33`，含兩個 GET handler 內寫入）→ 抽成 `expireStaleInvitations()`。
- CLI：`--json` 輸出樣板抽成 helper；`getComment` 目前抓全部留言再前端過濾（`api-client.ts:221-232`）→ 後端補一條 `GET .../comments/:commentId`。
- HTML 處理散落三處（`shared/utils/html.ts` 偵測、`server/utils/html.ts` sanitize/strip、CLI `formatters.ts:80-82` strip）→ 可收斂到 shared。

---

## 4. 優先順序

| 級別 | 項目 | 狀態 |
|------|------|------|
| **P0** | A 錯誤處理層收斂（外洩 + 400/500 不一致 + statusMessage） | ✅ 已完成 |
| **P0** | C useFetch key 修正 | ✅ 已完成 |
| **P0** | D 補 transaction 與 unique constraint | ✅ 已完成 |
| **P0** | H serverless DB 連線設定 | ✅ 已完成 |
| **P1** | B CLI 型別單源化（已確認可自由修改） | ⬜ 未開始 |
| **P1** | E access helper 貫徹 + RLS 註記 | ⬜ 未開始 |
| **P1** | F 表單驗證單軌化 | ⬜ 未開始 |
| **P2** | G handler 業務邏輯抽取 + 首批服務層測試 | ⬜ 未開始 |
| **P2** | 回應 envelope 統一、死碼清理、CLI 小項、HTML 工具收斂 | ⬜ 未開始 |

P0 各項都是局部、機械式、可逐檔提交的改動，不動架構骨架；P1 是消除平行真相源；P2 是為長期演進鋪路。

---

## 5. 審查後續釐清（2026-07-06）

1. **部署目標**：前端 + Nuxt server routes 在 Vercel（serverless），DB/Auth 在 Supabase → 新增建議 H。
2. **RLS 意圖**：無 client 直連 Supabase 的計畫 → RLS 維持「enabled + 零 policy」的鎖死狀態即可，僅補文件說明。
3. **CLI 相容性**：僅內部使用 → 建議 B 可自由執行，無 breaking change 顧慮。
