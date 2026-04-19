## Why

Issues today have a creator (`created_by`) but no owner of the work. Teams need an explicit way to hand an issue to a specific teammate and to get that person's attention immediately via the in-app bell, so nothing falls through the cracks between "reported" and "being worked on".

## What Changes

- Add an `assignee_id` field on the `issues` table (nullable) referencing `profiles.id`, plus index to support lookups.
- Extend `issueSchema` / `updateIssueSchema` (and the create schema) in `shared/schemas/issue.ts` to accept a nullable `assigneeId`.
- `PATCH /api/projects/:projectId/issues/:issueId` accepts `assigneeId` updates. **No permission gate beyond existing project access** — any project member / owner can change the assignee (matches PRD `ISSUE-*` access rules).
- `POST /api/projects/:projectId/issues` accepts optional `assigneeId` at creation time.
- API responses include the assignee's profile summary (`id`, `name`, `email`) alongside the existing creator summary.
- Issue form (create + edit) exposes an "Assignee" dropdown sourced from `GET /api/projects/:projectId/members` (existing endpoint), with an "Unassigned" option.
- Issue list / detail views show the current assignee.
- When the assignee changes (assign, reassign, unassign → re-assign), the newly assigned user receives a notification (type `issue_update` — existing bell stream) unless the actor is assigning themselves. Unassigning produces no notification.
- PRD update in `docs/prd/issues.md` describing the assignee field and notification trigger.

## Capabilities

### New Capabilities
- `issue-assignee`: the assignee field itself — data model, create/update API acceptance, members-based dropdown rules, unassigned state.
- `issue-assignee-notification`: notification trigger when an issue is assigned to someone other than the actor.

### Modified Capabilities
_None._ The existing `issue-status-notification` capability is unrelated (status changes); assignee notifications are a distinct trigger and live in their own spec.

## Non-goals

- No permission/role gating on assignee changes — anyone with project access can assign (explicit user requirement).
- No multi-assignee support; the field holds a single user or NULL.
- No email / push notifications — in-app bell only (reuses existing notification stream).
- No notification on unassign (setting assignee to NULL).
- No filtering or sorting the issue list by assignee in this change.
- No assignee for the CLI (`packages/cli`) in this change.

## Impact

- **Schema:** `server/database/schema/issues.ts` — add `assigneeId` column + index. New Drizzle migration in `server/database/migrations/`.
- **Shared:** `shared/schemas/issue.ts` — add `assigneeId` to create/update/response schemas.
- **Server:**
  - `server/api/projects/[projectId]/issues/index.post.ts` — accept `assigneeId`.
  - `server/api/projects/[projectId]/issues/[issueId]/index.patch.ts` — accept `assigneeId`, emit assignee notification on change.
  - `server/api/projects/[projectId]/issues/[issueId]/index.get.ts` and list endpoint — join assignee profile in response.
  - Optional helper in `server/utils/` to resolve assignee profile summary and to validate the assignee is a project member (or owner).
- **Client:**
  - `app/components/IssueForm.vue` — add Assignee `USelect` populated from `useProjectMembers()`.
  - Issue detail / list components — render assignee chip.
  - New/updated composable: `useProjectMembers(projectId)` if missing.
- **Docs:** `docs/prd/issues.md` — document assignee field and notification behavior.
- **Dependencies:** none added.
