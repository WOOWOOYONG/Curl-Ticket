## Context

Issue comments in Curl Ticket currently use a plain `UTextarea` for input and render content as `whitespace-pre-wrap` text. The `content` column in `issue_comments` stores plain strings up to 2000 characters. Nuxt UI v4.4.0 (already installed) ships built-in Editor components powered by Tiptap, making rich text editing a zero-dependency upgrade.

Key files in current implementation:
- `app/components/IssueComments.vue` — composer + comment display
- `shared/schemas/issue-comment.ts` — Zod validation (`createCommentSchema`, `commentSchema`)
- `server/api/.../comments.post.ts` — create comment API route
- `server/api/.../comments.get.ts` — list comments API route
- Notification creation in `comments.post.ts` uses `content` for notification preview

## Goals / Non-Goals

**Goals:**
- Replace the plain textarea with Nuxt UI's `Editor` + `EditorToolbar` for comment composition
- Support a curated set of formatting options relevant to API debugging: bold, italic, inline code, code blocks, bullet lists, ordered lists, links, blockquotes
- Store content as HTML in the existing `content` column
- Render stored HTML safely in the comment display area
- Maintain backward compatibility with existing plain-text comments
- Keep notification preview as plain text (strip HTML tags)

**Non-Goals:**
- Image/file uploads, mentions, slash commands, emoji picker
- Collaborative or real-time editing
- Database migration (reusing existing `text` column)
- Converting existing plain-text comments to HTML

## Decisions

### 1. Use Nuxt UI Editor components (not standalone Tiptap)

**Choice:** `Editor`, `EditorToolbar` from `@nuxt/ui`
**Over:** Installing `@tiptap/vue-3` + extensions separately

**Rationale:** Already included in the project's Nuxt UI v4.4.0. Provides consistent styling, SSR handling, and follows the existing component convention. Avoids adding new dependencies.

### 2. Store content as HTML

**Choice:** HTML string in the `content` column
**Over:** Markdown or Tiptap JSON

**Rationale:**
- Nuxt UI Editor outputs HTML natively — no conversion step needed
- HTML renders directly without a parser library
- The `content` column is already `text` type — no schema change needed
- Markdown would require a markdown-to-HTML renderer for display
- Tiptap JSON would couple storage to the editor library

### 3. Increase content max length from 2000 to 5000

**Choice:** Raise `createCommentSchema` max from 2000 to 5000 characters
**Rationale:** HTML tags add overhead to the same visible content. A 2000-character plain text comment could easily become 3000+ characters in HTML. 5000 provides headroom without allowing abuse.

### 4. Sanitize HTML on render (client-side)

**Choice:** Use `v-html` with a lightweight sanitizer (DOMPurify or built-in browser sanitization via Tiptap's `generateHTML`)
**Over:** Server-side sanitization on store

**Rationale:**
- Tiptap's Editor already produces safe HTML from its schema (only allowed nodes/marks)
- Adding DOMPurify (~7kB gzipped) as a safety net for rendering is defense-in-depth
- Server-side sanitization adds complexity and another dependency on the server
- If the editor is the only input path, the content is inherently safe — but `v-html` without sanitization is a security risk if content could come from other sources (API, imports)

**Decision:** Use `v-html` for rendering. Add server-side validation that the content is well-formed HTML within allowed tags. This prevents XSS even if content is injected through non-editor paths.

### 5. Detect plain-text vs HTML for backward compatibility

**Choice:** Simple heuristic — if content contains no HTML tags, wrap in `<p>` tags for display
**Rationale:** Existing comments are plain text. Rather than migrating data, detect and handle both formats at render time. A regex check for `<[a-z][\s\S]*>` is sufficient.

### 6. Strip HTML for notification previews

**Choice:** Strip HTML tags from content before storing notification preview text
**Implementation:** Simple regex `content.replace(/<[^>]*>/g, '')` on the server when creating notifications
**Rationale:** Notifications show a 200-char text preview. HTML tags would waste space and be unreadable.

### 7. Toolbar configuration

**Choice:** Code-focused subset of formatting options
**Actions:** Bold, Italic, Strikethrough | Code (inline), Code Block | Bullet List, Ordered List | Blockquote, Link
**Rationale:** This is an API debugging tool — code formatting is essential. Full word-processor features (tables, images, colors) would add clutter without value.

## Risks / Trade-offs

**[Bundle size increase]** → Nuxt UI Editor components add Tiptap to the client bundle (~45kB gzipped for core + extensions). Acceptable since these are already bundled with Nuxt UI — they're just tree-shaken out if unused. Once we import them, they'll be included.

**[HTML content size]** → HTML overhead means the same visible content takes more storage space. → Mitigated by increasing max length to 5000. Monitor if this needs further adjustment.

**[Plain-text detection heuristic]** → The regex check could false-positive on content containing `<` characters in technical discussions. → Mitigated: only trigger HTML rendering when content looks like it has actual HTML tags (balanced tags, not just angle brackets in text). Plain text with `<` in code will still render safely since it won't match structured tag patterns.

**[XSS surface]** → Using `v-html` introduces XSS risk if content is not properly sanitized. → Mitigated by server-side allowed-tag validation + Tiptap's schema constraining output to safe HTML. Consider adding DOMPurify as an extra layer if the threat model expands.
