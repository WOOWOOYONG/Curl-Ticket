## 1. Database Schema & Migration

- [x] 1.1 Add `updatedAt` column (`timestamp`, nullable, default `null`) to `issue_comments` in `server/database/schema/issue-comments.ts`
- [x] 1.2 Run `pnpm db:generate` to generate migration SQL
- [x] 1.3 Review generated migration file, then run `pnpm db:migrate` to apply

## 2. Shared Schemas

- [x] 2.1 Add `updateCommentSchema` to `shared/schemas/issue-comment.ts` with `content` field (same validation as `createCommentSchema`)
- [x] 2.2 Update `commentSchema` to include `updatedAt: z.coerce.date().nullable()`
- [x] 2.3 Export `UpdateCommentInput` type from the schema

## 3. API Route

- [x] 3.1 Create `server/api/projects/[projectId]/issues/[issueId]/comments/[commentId].patch.ts`
- [x] 3.2 Implement: validate params, verify project access via `getAccessibleProject()`, verify comment exists and belongs to the issue, verify author ownership (403 if not), validate body with `updateCommentSchema`, validate HTML with `isAllowedHtml()`, update `content` and `updated_at`, return updated comment with author info

## 4. Server Response Updates

- [x] 4.1 Update `comments.get.ts` to include `updatedAt` in the SELECT query and response
- [x] 4.2 Update `comments.post.ts` to include `updatedAt` (null) in the response

## 5. Frontend — Edit Mode UI

- [x] 5.1 Add `editingId` ref (`number | null`) and `editContent` ref (`string`) to `IssueComments.vue`
- [x] 5.2 Extract toolbar items config to a `const` or a shared variable so both composer and inline editor use the same config (already done — `toolbarItems`)
- [x] 5.3 Add "Edit" button to the comment `...` popover menu (below "Delete"), only visible for own comments
- [x] 5.4 Implement `startEdit(comment)` function: sets `editingId` to the comment ID and `editContent` to the existing content
- [x] 5.5 Implement `cancelEdit()` function: resets `editingId` to null
- [x] 5.6 Implement `saveEdit()` function: sends PATCH request with `editContent`, refreshes comments, resets `editingId`
- [x] 5.7 In the comment card body, conditionally render: if `editingId === comment.id`, show inline `UEditor` with `EditorToolbar` + "Save" / "Cancel" buttons; otherwise show the existing read-only content
- [x] 5.8 Add "(edited)" text next to the timestamp in the comment card header when `comment.updatedAt` is not null

## 6. Verification

- [x] 6.1 Run `pnpm lint` and fix any linting errors
- [x] 6.2 Run `pnpm typecheck` and fix any type errors
- [x] 6.3 Manual testing: edit a comment, verify content updates, verify "(edited)" shows, verify cancel discards changes, verify non-author cannot see "Edit" button
