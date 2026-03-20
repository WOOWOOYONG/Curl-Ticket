## Why

Issue comments currently use a plain `UTextarea` with no formatting support. Engineering teams discussing API issues need to share code snippets, JSON payloads, and structured notes — plain text makes these hard to read and reference. Nuxt UI v4.3+ now ships a built-in Editor component (powered by Tiptap), making this a zero-dependency upgrade.

## What Changes

- Replace the `UTextarea` comment composer in `IssueComments.vue` with Nuxt UI's `Editor` + `EditorToolbar` components
- Support rich text formatting: bold, italic, inline code, code blocks, bullet/ordered lists, links, and blockquotes
- Store comment content as HTML (replacing plain text) in the `content` column of the `issue_comments` table
- Render existing plain-text comments as-is (backward compatible — no migration needed)
- Update the comment display area to render HTML content safely instead of `whitespace-pre-wrap` plain text
- Update the Zod validation schema to accept HTML content and adjust max length validation accordingly
- Add a toolbar with contextually relevant formatting actions (code-focused subset, not a full word processor)

## Non-goals

- Collaborative real-time editing (comments are individual posts)
- Image/file upload in comments
- Markdown storage format (HTML is the canonical format; markdown input shortcuts via Tiptap are fine)
- Slash commands, mentions, or emoji picker (can be added later as separate changes)
- Migrating existing plain-text comments to HTML

## Capabilities

### New Capabilities

- `rich-text-editor`: Rich text editing capability for issue comments using Nuxt UI Editor components, including toolbar configuration, HTML content serialization, and safe HTML rendering

### Modified Capabilities

_None — no existing spec-level requirements are changing._

## Impact

- **Components**: `app/components/IssueComments.vue` (major rewrite of composer and display sections)
- **Validation**: `shared/schemas/issue-comment.ts` (content field validation update)
- **Server**: `server/api/projects/[projectId]/issues/[issueId]/comments/index.post.ts` (accept HTML content)
- **Database**: No schema change needed — `content` column is already `text` type
- **Dependencies**: No new npm packages — Nuxt UI v4.4.0 includes the Editor components
- **Security**: HTML sanitization required on render to prevent XSS
- **PRD**: `docs/prd/issues.md` may reference comment requirements (ISSUE-* IDs)
