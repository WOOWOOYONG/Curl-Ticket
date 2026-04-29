## Why

Issue 詳細頁 (`app/pages/projects/[id]/issues/[issueId]/index.vue`) 對 Task 類型 issue 重複顯示 description，且把 `create-task` skill 產生的 Markdown 內容當純文字輸出（如 `## Why`、`-` bullet 都是字面字元）。`cli-create-task-skill` 與 `cli-issue-description-template` 都把 description 設計成 Markdown 模板，但前端從未渲染，使用者體驗破碎。

## What Changes

- 移除標題下方的 description 段落（`index.vue` 約 289-294 行），讓 description 只在卡片區出現一次。
- 為 API Bug 類型補上一個 Description 卡片（與 Task 卡片共用元件），維持兩種 issue type 的版面一致。
- 新增 `app/components/MarkdownRenderer.vue`，使用 `markdown-it` 解析、`isomorphic-dompurify` 做 SSR 友善的 XSS sanitize，外層用 Tailwind `prose prose-sm dark:prose-invert` 套樣式。
- Description 卡片以 `<MarkdownRenderer :source="issue.description" />` 取代 `{{ issue.description }}`。
- 安裝 `markdown-it`、`@types/markdown-it`、`isomorphic-dompurify` 為 runtime / dev 依賴。

## Capabilities

### New Capabilities
- `issue-description-render`: 規範 Issue 詳細頁如何呈現 description（去重、Markdown 渲染、sanitize）。

### Modified Capabilities
<!-- 無；此次只新增前端渲染能力，未改動既有 spec 行為 -->

## Impact

- **Affected code**:
  - `app/pages/projects/[id]/issues/[issueId]/index.vue`（移除重複段落、改用元件）
  - `app/components/MarkdownRenderer.vue`（新增）
  - `package.json`（新增依賴）
- **Dependencies**: `markdown-it`、`isomorphic-dompurify`（runtime）；`@types/markdown-it`（dev）
- **APIs**: 無變更
- **PRD modules**: 不需更新；本次屬於前端呈現修正

## Non-goals

- 不變更 description 的儲存格式（DB 仍存原始 Markdown 字串）。
- 不引入 syntax highlighting for code blocks（後續另議）。
- 不改 Comments 區的 Markdown 渲染（可作為後續沿用 `MarkdownRenderer` 的 follow-up）。
- 不修改 CLI skill 模板。
