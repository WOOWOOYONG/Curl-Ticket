## Why

The recently shipped issue assignee feature (ISSUE-*) lets users pick an assignee per issue, but there is no cross-project surface to answer the question "what is assigned to me right now?" Users today must open each project individually and scan its issue list. A consolidated workbench — matching industry patterns (GitHub `/issues/assigned`, Linear *My Issues*, Jira *Assigned to me*) — unblocks daily triage and makes the assignee feature actually useful.

## What Changes

- Add a new authenticated page `/my-issues` surfacing every issue where `assignee_id = current user` across every project the user still has access to.
- Add a sidebar nav entry (icon `i-lucide-inbox`) placed between **Projects** and **Invitations (Admin)**; may display an open+in-progress count badge.
- Add a compact "Assigned to me" summary block on the Dashboard (`/`) showing totals and a few recent items, linking to `/my-issues`.
- Add a new API endpoint `GET /api/me/issues` returning paginated, filterable assignments plus a status-breakdown summary. Results are gated by `buildProjectAccessCondition` so revoked-access projects drop out automatically.
- Add a shared Zod schema `myIssuesQuerySchema` (`shared/schemas/me-issues.ts`) and composables `useMyIssues` / `useMyIssuesSummary` (match `useProjects` reactive-key pattern).
- Extend `myIssues.*` i18n keys in `app/i18n/locales/*.json`.

## Capabilities

### New Capabilities
- `my-issues`: Cross-project "assigned to me" workbench — list API, page, sidebar entry, dashboard summary, and filtering/sorting contract.

### Modified Capabilities
- _(none — no existing spec's requirements change; `issue-create` still owns assignee write semantics)_

## Impact

- **New code**
  - `server/api/me/issues/index.get.ts` — list + summary endpoint
  - `shared/schemas/me-issues.ts` — `myIssuesQuerySchema`, response types
  - `app/composables/useMyIssues.ts` — `useMyIssues()`, `useMyIssuesSummary()`
  - `app/pages/my-issues.vue` — page with summary cards, filter toolbar, paginated list, empty state
- **Modified code**
  - `app/layouts/default.vue` — add nav item (and optional badge)
  - `app/pages/index.vue` — insert "Assigned to me" summary block
  - `app/i18n/locales/en.json`, `zh-TW.json` — new `myIssues.*` keys
- **Docs**: `docs/prd/issues.md` gains an "Assigned to me view" subsection; `docs/prd/README.md` gets a cross-reference.
- **Security**: assignee identity read only from `event.context.userId` — query cannot override it; soft-deleted issues excluded; project-access condition prevents leaking issues from projects the user was removed from.
- **No DB schema changes**: `issues.assignee_id` already exists; an index on `(assignee_id, status)` may be considered later but is out of scope for this change.

## Non-goals

- No new assignee write paths — creating/updating issues continues to flow through existing `POST /api/projects/:id/issues` and `PATCH /api/projects/:id/issues/:id`.
- No notification changes — subscribing to "assigned to me" events is a separate capability.
- No saved views / custom filters persistence — filters live in URL query only.
- No bulk actions (bulk reassign, bulk close) in this change.
- No mobile-specific redesign beyond the existing responsive patterns used on Dashboard.
