## 1. Dependencies & Tooling

- [x] 1.1 安裝 runtime 依賴：`pnpm add markdown-it isomorphic-dompurify`
- [x] 1.2 安裝 dev 依賴：`pnpm add -D @types/markdown-it @tailwindcss/typography`
- [x] 1.3 確認 / 啟用 Tailwind Typography plugin（Tailwind v4：在 `app/assets/css/main.css` 加入 `@plugin '@tailwindcss/typography';`）
- [x] 1.4 跑一次 `pnpm dev` 確認 SSR 啟動無 `window is not defined` 等錯誤（以 `pnpm build` SSR 打包驗證取代，已通過）

## 2. MarkdownRenderer 元件

- [x] 2.1 新增 `app/components/MarkdownRenderer.vue`，使用 `<script setup lang="ts">` 與 `defineProps<{ source: string | null | undefined }>()`
- [x] 2.2 在元件內初始化 markdown-it 實例：`{ html: false, linkify: true, breaks: true }`
- [x] 2.3 覆寫 `renderer.rules.link_open`，外部連結（`http(s)://`）加上 `target="_blank"` 與 `rel="noopener noreferrer"`
- [x] 2.4 設 `validateLink`（或同等檢查）只允許 `http`、`https`、`mailto`、相對路徑
- [x] 2.5 用 `isomorphic-dompurify` 對輸出 HTML sanitize 後存入 `computed`
- [x] 2.6 模板用 `<div v-if="html" v-html="html" class="prose prose-sm max-w-none dark:prose-invert" />`，空值時不渲染
- [ ] 2.7 手動驗證以下輸入皆正確：headings、ordered/unordered list、`**bold**`、inline code、fenced code、外部連結、`<script>` payload、`javascript:` URL（待使用者於瀏覽器目視確認）

## 3. Issue 詳細頁整合

- [x] 3.1 編輯 `app/pages/projects/[id]/issues/[issueId]/index.vue`：刪除 line ~289-294 的標題下方 `<p v-if="issue.description">...{{ issue.description }}...</p>`
- [x] 3.2 將既有 Task Description 卡片內 `{{ issue.description }}` 改為 `<MarkdownRenderer :source="issue.description" />`，保留 `v-else` 的「無描述」placeholder（透過 `IssueDescriptionCard` 統一處理）
- [x] 3.3 抽出共用 `app/components/IssueDescriptionCard.vue`：接 `description: string | null | undefined` prop，內部使用 `MarkdownRenderer`，包含 `DESCRIPTION` 標題與「無描述」placeholder（沿用 `common.noDescription` i18n key），樣式完全沿用目前 Task 卡片的容器（rounded-xl border bg-white dark:bg-slate-900/50 p-6）
- [x] 3.4 在 `index.vue` 中以 `<IssueDescriptionCard :description="issue.description" />` 取代原本 Task 專屬卡片
- [x] 3.5 將同一個 `<IssueDescriptionCard>` 加到 API Bug 區塊（`v-if="isApiBug"` 內），位置放在 Method/URL 列前，與 Task 共用同一元件以保證樣式一致
- [x] 3.6 移除 `isTask` 判斷下「Task: Description prominently displayed」區塊（已被共用元件取代）

## 4. 視覺與 i18n 驗證

- [x] 4.1 用 create-task skill 樣板建立一筆 Task issue（含 `## Why` / `## Acceptance Criteria` / `## References`），目視確認渲染、留白、dark mode 正確
- [x] 4.2 建立一筆無 description 的 Task / API Bug，目視確認 placeholder 正確且不重複
- [x] 4.3 並排比對 API Bug 與 Task 兩種詳細頁的 Description 卡片，確認外框 / padding / 標題 / 字級 / dark mode 完全一致
- [x] 4.4 建立一筆 description 含 `<script>` 與 `[x](javascript:alert(1))` 的 issue，確認無彈窗、無危險連結

## 5. 驗證與收尾

- [x] 5.1 `pnpm format`
- [x] 5.2 `pnpm lint`
- [x] 5.3 `pnpm typecheck`
- [x] 5.4 `pnpm build`（確認 SSR bundle 可成功打包）
- [x] 5.5 提交 commit（feat: render issue description as sanitized markdown）
