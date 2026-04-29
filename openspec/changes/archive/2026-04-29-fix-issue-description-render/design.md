## Context

Issue 詳細頁同時有兩處渲染 `issue.description`：標題下段落 (line 289-294) 與 Task 專屬 Description 卡片 (line 521-526)，造成 Task 類型重複顯示。兩處都用 `{{ issue.description }}` + `whitespace-pre-wrap`，僅保留換行，無法解析 Markdown。

`packages/cli/skills/curl-ticket-create-task` 與 `cli-issue-description-template` 把 description 設計為包含 `## Why`、`## Acceptance Criteria`、`## References` 等小節的 Markdown 模板，是團隊已採行的內容慣例。

專案現有依賴僅有 `shiki`（JSON 高亮）；無 Markdown 解析器。

## Goals / Non-Goals

**Goals:**
- Description 在頁面只出現一次
- Markdown 內容（標題、清單、程式碼、連結、粗體、引用）正確渲染並符合 dark mode
- 渲染流程在 SSR / CSR 皆安全，不允許 XSS
- 元件可在後續被 IssueComments、Edit 預覽等沿用

**Non-Goals:**
- 不改 description 的儲存格式
- 不支援自訂 markdown extension（footnote、mermaid、math）
- 不在此次處理 Comments 區渲染

## Decisions

### 1. 用 `markdown-it` 而非 `marked` 或 `@nuxtjs/mdc`

- `markdown-it`：成熟、API 穩定、可關掉 raw HTML、套件小（~40KB gzipped 含 plugin），適合純 Markdown → HTML。
- `marked`：類似但 plugin 生態較弱、近年 API 變動較多。
- `@nuxtjs/mdc`：強大但會把 Nuxt Content runtime 也一起拉進來，bundle 變大、SSR 設定較重；對只渲染使用者輸入字串而言過頭。

選 `markdown-it`，初始化時設 `{ html: false, linkify: true, breaks: true }`：
- `html: false` 直接拒絕原始 HTML（第一道防線）
- `linkify: true` 自動把純文字 URL 轉連結
- `breaks: true` 與目前 `whitespace-pre-wrap` 行為對齊（換行 → `<br>`）

### 2. 用 `isomorphic-dompurify` 做 sanitize

即使 `html: false`，仍以 DOMPurify 做第二道防線（縱深防禦），避免未來改設定造成漏洞。`isomorphic-dompurify` 在 Node 端用 jsdom，瀏覽器端用 DOMPurify，符合 Nuxt 4 SSR 環境。

替代：`dompurify` + 手動 jsdom 包裝 — 複雜且重工。

### 3. `MarkdownRenderer.vue` 元件介面

```ts
defineProps<{ source: string | null | undefined }>()
```

- 內部 `computed` 把 `source` 過 markdown-it → DOMPurify → 字串 HTML
- 用 `<div v-html="html" class="prose prose-sm max-w-none dark:prose-invert">`
- 空字串時不渲染（讓父層自行顯示 placeholder）

替代：scoped slots 暴露 AST。過度設計，用不到。

### 4. 統一 Description 卡片，移除標題下段落

兩種 issue type 共用同一個卡片元件結構：
- API Bug：在現有 Tabs 上方加一張 Description 卡片，僅在 `issue.description` 非空時顯示
- Task：保留原 Description 卡片，內部換成 `MarkdownRenderer`

→ 標題下方 line 289-294 整段刪除。

替代 A：保留標題下方段落但加 `v-if="!isTask"` — 仍不一致，且 API Bug 的長 description 會擠壓標題視覺。
替代 B：API Bug 不顯示 description — 與目前行為不符，會讓既有 issue 看不到資訊。

### 5. Tailwind Typography (`prose`)

需要安裝/啟用 `@tailwindcss/typography`。檢查 `nuxt.config.ts` / `tailwind.config` — 若尚未啟用則加 plugin。`prose-sm` 對齊現有 `text-sm`，`max-w-none` 解除 prose 的 65ch 上限以填滿卡片。

## Risks / Trade-offs

- **[Risk] XSS via Markdown link `javascript:` URI** → DOMPurify 預設會擋；額外設 markdown-it `validateLink` 白名單 (`http`, `https`, `mailto`, `/`).
- **[Risk] SSR bundle 變大** → `markdown-it` ≈ 40KB gz、`isomorphic-dompurify` ≈ 20KB gz；可接受。若日後超出，可改用 dynamic import + client-only 渲染。
- **[Risk] 既有 description 內含意外的 `<` `>` 字元** → markdown-it 預設會 HTML-escape 純文字；DOMPurify 再過濾一次，安全。
- **[Trade-off] `breaks: true` 會把單一 `\n` 變 `<br>`** → 與目前 `whitespace-pre-wrap` 行為一致，使用者習慣不變；但 GFM 嚴格規格不會這樣。決定接受此偏離以維持回溯相容。
- **[Risk] `prose` 樣式覆蓋 Nuxt UI 元件** → `MarkdownRenderer` 渲染區是純文字 HTML，內部不放 Nuxt UI 元件，無衝突。

## Migration Plan

無資料遷移；純前端變更。Rollback 直接 revert commit 即可。

## Open Questions

- 是否在 `MarkdownRenderer` 加 `target="_blank" rel="noopener"` 給外部連結？建議：是（透過 markdown-it `renderer.rules.link_open` 覆寫），列入 tasks。
