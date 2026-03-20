## 1. Validation & Server Changes

- [ ] 1.1 Update `shared/schemas/issue-comment.ts`: change `createCommentSchema` max length from 2000 to 5000
- [ ] 1.2 Update `server/api/.../comments.post.ts`: strip HTML tags from `result.data.content` before storing notification preview text (use regex `replace(/<[^>]*>/g, '')`)
- [ ] 1.3 Create server utility function `server/utils/html.ts` with `stripHtmlTags(html: string): string` and `isHtmlContent(content: string): boolean` helpers

## 2. Comment Composer — Replace UTextarea with Editor

- [ ] 2.1 Replace `UTextarea` in `IssueComments.vue` composer section with Nuxt UI `Editor` component, binding `v-model` to `newComment` ref
- [ ] 2.2 Add `EditorToolbar` with actions: Bold, Italic, Strikethrough, Inline Code, Code Block, Bullet List, Ordered List, Blockquote, Link
- [ ] 2.3 Update `canSubmit` computed to check if editor content is empty (detect empty HTML like `<p></p>` or empty string)
- [ ] 2.4 Update character count display: adjust thresholds to 4500 (amber) and 4750 (red), max display to 5000
- [ ] 2.5 Update `submitComment()` to clear the editor after successful submission

## 3. Comment Display — Render HTML Content

- [ ] 3.1 Update comment card body in `IssueComments.vue` to detect HTML vs plain-text content using `isHtmlContent()` helper
- [ ] 3.2 Render HTML comments using `v-html` with proper prose styling (Tailwind `prose` classes for consistent typography)
- [ ] 3.3 Render plain-text comments (backward compat) with existing `whitespace-pre-wrap` styling
- [ ] 3.4 Add scoped CSS or Tailwind prose overrides for code blocks, blockquotes, and lists within comment cards

## 4. Security

- [ ] 4.1 Add server-side HTML validation in `comments.post.ts`: verify content only contains allowed tags (p, strong, em, s, code, pre, ul, ol, li, blockquote, a, br, h1-h6)
- [ ] 4.2 Sanitize rendered HTML on the client side — evaluate using DOMPurify or relying on Tiptap's schema-constrained output with allowed-tag filtering

## 5. Verification

- [ ] 5.1 Run `pnpm lint` and fix any linting errors
- [ ] 5.2 Run `pnpm typecheck` and fix any type errors
- [ ] 5.3 Manual testing: create a rich text comment, verify it renders correctly, verify plain-text old comments still display properly, verify notification preview is plain text
