## Why

Users cannot fix typos or update their comments after posting. This is a basic expectation in any collaborative tool — GitHub, Linear, and Jira all support comment editing. The rich text editor was just added to comments, making the lack of editing even more noticeable: a formatting mistake now requires deleting the entire comment and rewriting it.

## What Changes

- Add a PATCH API endpoint `PATCH /api/projects/:projectId/issues/:issueId/comments/:commentId` for updating comment content
- Add `updated_at` column to the `issue_comments` database table (requires Drizzle migration)
- Add an "Edit" action to the comment card's popover menu (alongside the existing "Delete"), only visible for the author's own comments — matching GitHub's `...` menu pattern
- When editing, replace the comment body with an inline rich text editor (same `UEditor` + `EditorToolbar` used in the composer), pre-populated with the existing content
- Show "Save" and "Cancel" buttons below the inline editor
- Display "(edited)" indicator next to the timestamp when `updated_at` differs from `created_at`, matching GitHub's convention
- Update the Zod schema to add an `updateCommentSchema`
- Return `updatedAt` in the comment response schema

## Non-goals

- Edit history / revision tracking (GitHub hides this behind a click too — out of scope for now)
- Admin editing other users' comments
- Optimistic UI updates (full refresh after save is acceptable)
- Real-time update propagation to other viewers

## Capabilities

### New Capabilities

- `comment-editing`: Inline comment editing with PATCH API, authorization (author-only), inline editor UI, and edited indicator display

### Modified Capabilities

_None — no existing spec-level requirements are changing._

## Impact

- **Database**: `issue_comments` table needs `updated_at` column — requires a Drizzle migration (`pnpm db:generate` + `pnpm db:migrate`)
- **API**: New `PATCH /api/projects/:projectId/issues/:issueId/comments/:commentId` route
- **Schema**: `shared/schemas/issue-comment.ts` — add `updateCommentSchema`, update `commentSchema` to include `updatedAt`
- **Components**: `app/components/IssueComments.vue` — add edit mode UI, inline editor, edited indicator
- **Server utils**: Reuse existing `isAllowedHtml()` validation from `server/utils/html.ts`
- **PRD**: `docs/prd/issues.md` may need update for comment editing requirements
