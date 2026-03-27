## Why

Issues currently support Create, Read, and Update operations but lack Delete. This is a fundamental CRUD gap — users cannot remove issues that were created by mistake, are duplicates, or are no longer relevant. Without delete, stale issues accumulate and reduce the signal-to-noise ratio for engineering teams.

## What Changes

- Add a `DELETE /api/projects/:projectId/issues/:issueId` server endpoint with permission checks
- Add a delete button with confirmation modal to the issue detail page sidebar
- Only issue creators and project owners can delete issues (consistent with project delete permission model)
- Cascading deletion automatically removes related comments and notifications (existing DB constraints)
- Add i18n strings for delete-related UI text (en + zh-TW)

## Non-goals

- Soft delete / trash / undo — hard delete is acceptable for now (consistent with current project delete behavior)
- Bulk delete of multiple issues at once
- Delete from the issues list page (only from issue detail page)
- Admin override for deletion (only creator + project owner)

## Capabilities

### New Capabilities

- `issue-delete`: Server-side issue deletion endpoint with authorization, and client-side delete UI with confirmation flow

### Modified Capabilities

None — no existing spec-level requirements are changing.

## Impact

- **Server**: New API route `server/api/projects/[projectId]/issues/[issueId].delete.ts`
- **Frontend**: Modified issue detail page `app/pages/projects/[id]/issues/[issueId]/index.vue`
- **i18n**: New keys in `i18n/locales/en.json` and `i18n/locales/zh-TW.json`
- **Database**: No schema changes — relies on existing `onDelete: 'cascade'` on `issueComments` and `notifications` FK to `issues`
- **PRD**: `docs/prd/issues.md` would need a new requirement (e.g., ISSUE-DELETE-*) documenting the delete capability
- **Existing utilities reused**: `getAccessibleProject()`, `getProjectIssue()`, `forbidden()`, `ConfirmModal` component, `getIssuesCacheKey()`
