## ADDED Requirements

### Requirement: Issue description renders exactly once on detail page
The Issue 詳細頁 SHALL render `issue.description` in exactly one location, regardless of `issueType`. API Bug 與 Task 兩種類型 SHALL 共用同一個 Description 卡片元件，呈現相同的容器邊框、padding、標題樣式與內文 Markdown 渲染樣式。

#### Scenario: Task issue with description
- **WHEN** 使用者開啟 issueType 為 `Task` 且 description 非空的 issue 詳細頁
- **THEN** description 內容在頁面只出現一次，於主欄的 Description 卡片內

#### Scenario: API Bug issue with description
- **WHEN** 使用者開啟 issueType 為 `ApiBug` 且 description 非空的 issue 詳細頁
- **THEN** description 內容在頁面只出現一次，於主欄的 Description 卡片內，且不擠壓標題列

#### Scenario: Issue without description
- **WHEN** 使用者開啟 description 為空的 issue 詳細頁
- **THEN** Description 卡片仍以 placeholder 顯示「無描述」字樣（沿用既有 i18n key），不渲染重複區塊

#### Scenario: Visual parity between issue types
- **WHEN** 並排比較 API Bug 與 Task 的詳細頁 Description 卡片
- **THEN** 兩者的卡片外框、背景、標題（`DESCRIPTION` 小寫粗體標籤）、內文字級、間距、dark mode 樣式皆完全一致，僅內文 Markdown 內容不同

### Requirement: Issue description renders Markdown content
The Description 卡片 SHALL 將 description 字串視為 Markdown 並渲染為對應的 HTML 元素。

#### Scenario: Heading and list
- **WHEN** description 內含 `## Why\n...\n## Acceptance Criteria\n- 項目 A\n- 項目 B`
- **THEN** `## Why` 與 `## Acceptance Criteria` 顯示為 `<h2>`（透過 Tailwind prose 樣式），bullet 顯示為 `<ul><li>`

#### Scenario: Inline formatting and links
- **WHEN** description 內含 `**bold**`、`` `code` ``、`[link](https://example.com)`
- **THEN** 各自渲染為 `<strong>`、`<code>`、`<a href="https://example.com">`，且外部連結具 `target="_blank"` 與 `rel="noopener"`

#### Scenario: Plain newlines
- **WHEN** description 內含未以空白行分隔的相鄰行
- **THEN** 單一換行渲染為 `<br>`（保留現有 `whitespace-pre-wrap` 的視覺行為）

#### Scenario: Dark mode
- **WHEN** 使用者切換為 dark mode 並檢視 Markdown 內容
- **THEN** 文字、連結、code、blockquote 套用 `dark:prose-invert` 對比樣式

### Requirement: Markdown rendering is sanitized against XSS
渲染流程 SHALL 阻擋使用者輸入夾帶的 raw HTML 與危險協定，確保不會執行 script 或 navigation 至 `javascript:` URI。

#### Scenario: Raw script tag in description
- **WHEN** description 含 `<script>alert(1)</script>`
- **THEN** 渲染結果不包含可執行的 `<script>` 元素，內容以純文字（或被移除）呈現

#### Scenario: Dangerous link protocol
- **WHEN** description 含 `[x](javascript:alert(1))`
- **THEN** 對應 `<a>` 元素不存在或其 `href` 被移除，無法觸發 JavaScript 執行

#### Scenario: SSR safety
- **WHEN** 頁面在 server 端渲染（hydration 前）
- **THEN** sanitize 流程於 Node 環境正常執行（透過 isomorphic 方案），不丟出 `window is not defined` 等錯誤

### Requirement: Reusable MarkdownRenderer component
專案 SHALL 提供 `app/components/MarkdownRenderer.vue` 元件，接受 `source: string | null | undefined` prop，輸出 sanitize 後的 Markdown HTML，可被其他頁面沿用。

#### Scenario: Empty source
- **WHEN** 元件以 `source` 為空字串、`null` 或 `undefined` 呈現
- **THEN** 元件不渲染任何 DOM 內容（由父層自行處理 placeholder）

#### Scenario: Reactive source
- **WHEN** 父層元件更新 `source` prop
- **THEN** MarkdownRenderer 重新計算並更新渲染輸出
