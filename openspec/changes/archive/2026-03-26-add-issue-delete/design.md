## Context

Issues in Curl Ticket currently support Create, Read, and Update. The codebase already has a well-established pattern for resource deletion — project delete (`[projectId].delete.ts`) and comment delete (`[commentId].delete.ts`) — both following the same access-check → permission-check → delete → return `{ success: true }` flow.

The database schema already supports cascading deletes: `issueComments` and `notifications` tables have `onDelete: 'cascade'` on their FK to `issues`, so no orphaned records will remain.

## Goals / Non-Goals

**Goals:**
- Provide a DELETE endpoint that follows existing codebase patterns
- Restrict deletion to issue creators and project owners
- Provide a confirmation-gated UI on the issue detail page
- Invalidate relevant caches and navigate user back to project after deletion

**Non-Goals:**
- Soft delete / undo functionality
- Bulk deletion from the issues list
- CLI support for issue deletion (can be added later)

## Decisions

### 1. Permission model: creator + project owner

**Choice:** Only the issue's `createdBy` user or the project's `ownerId` can delete.

**Alternatives considered:**
- Any project member can delete → too permissive, risk of accidental data loss
- Only admin role can delete → too restrictive, issue creators should manage their own issues

**Rationale:** Matches the project delete pattern (`project.ownerId !== userId → forbidden`). The creator naturally owns their issue; the project owner has ultimate authority.

### 2. Hard delete (not soft delete)

**Choice:** Use `db.delete()` for permanent removal.

**Rationale:** Consistent with current project delete and comment delete behavior. The project already has a TODO for soft-delete on projects — when that is implemented, issue soft-delete can follow as a separate change.

### 3. Reuse `getProjectIssue()` from `comment-access.ts`

**Choice:** Reuse the existing `getProjectIssue()` utility to verify issue belongs to project.

**Alternatives considered:**
- Inline the query in the delete handler → duplicates existing logic
- Create a new `issue-access.ts` utility → unnecessary for a single function reuse

**Rationale:** `getProjectIssue()` already returns `createdBy` in its select, which is exactly what we need for the permission check.

### 4. Delete button placement: issue detail sidebar

**Choice:** Add the delete button below the existing "Edit Details" button in the right sidebar, using the existing `ConfirmModal` component.

**Rationale:** Groups all issue actions together. The confirmation modal prevents accidental deletion. This matches the pattern used for project deletion on the projects list page.

## Risks / Trade-offs

- **[Data loss is permanent]** → Mitigated by confirmation modal with explicit issue ID shown. Acceptable trade-off given current project delete behavior is also hard delete.
- **[Cascade deletes comments and notifications]** → This is desired behavior. Users should be aware via the confirmation message. No additional warning needed since comments are subordinate to issues.
- **[No audit trail]** → Without activity logging, there's no record of who deleted what. This is a pre-existing gap across the app, not specific to this change.
