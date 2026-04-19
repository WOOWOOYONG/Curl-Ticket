## Context

Issues currently store only `created_by` (the reporter). In practice, the reporter is rarely the person who fixes the bug, so teams need a first-class "assignee" to route work and keep the owner's bell in sync. Project access is already gated by ownership or `project_members`; the new field just extends the existing issue record and reuses the existing notification pipeline (`notifications` table + bell UI).

Relevant existing pieces we lean on:

- `server/database/schema/issues.ts` — issue row we'll extend.
- `server/api/projects/[projectId]/issues/[issueId].patch.ts` — already writes `notifications` inside a transaction when `status` changes; the assignee-change notification will live alongside that same transaction.
- `server/api/projects/[projectId]/members.get.ts` — already returns project members with `userId` / `name` / `email` and filters out soft-deleted profiles. The assignee dropdown reuses this.
- `shared/schemas/issue.ts` — single source of truth for validation, feeding both `POST` and `PATCH` handlers.
- `shared/constants.ts` — `NotificationType.IssueUpdate` is reused for assignee notifications (same bell stream).

## Goals / Non-Goals

**Goals:**
- Store a nullable assignee on each issue and let any project member (including the owner) set or clear it.
- Surface the current assignee in list and detail views and expose a dropdown backed by the project's members.
- Fire exactly one bell notification to the newly assigned user on assignment change (excluding self-assign and unassign).
- Keep validation consistent between client and server via the existing Zod schema pattern.

**Non-Goals:**
- Role- or permission-based gating on who can assign (explicit product call — anyone with project access can change the assignee).
- Multi-assignee, watcher lists, or team-level assignment.
- Email / push notifications or a new `NotificationType` value.
- CLI support for assignee in this change.
- Filtering / sorting / dashboard aggregation by assignee.

## Decisions

### D1. New column `issues.assignee_id` (nullable UUID referencing `profiles.id`)

- **Why a dedicated column, not a join table:** a single assignee is a 1:1 relation; a join table would add query cost (always joined) without a concrete use case (non-goal).
- **Why nullable:** "Unassigned" is a valid and common state; using NULL avoids a magic UUID.
- **`onDelete`:** `set null`. If the assignee is deleted or their profile is removed, the issue stays; it just becomes unassigned. `cascade` would be wrong (we'd lose the issue), `restrict` would block legitimate profile deletion.
- **Index:** `create index issues_assignee_idx on issues (assignee_id)` to keep "issues assigned to me" lookups cheap later; it's a small cost now and a common future query.

### D2. Assignee validation: must be a project member OR the project owner — enforced server-side

- **Why enforce membership:** the dropdown is already scoped to members, so accepting any arbitrary `profiles.id` would only happen via direct API calls. Rejecting non-members keeps data consistent with the UI contract and prevents leaking issues to users who wouldn't otherwise be authorized to see them.
- **How:** a small helper (`assertAssigneeAllowed(db, projectId, assigneeId)`) that throws `badRequest` if `assigneeId` is neither the project owner nor a row in `project_members`. Called from both `POST` and `PATCH` handlers when `assigneeId` is set to a non-null value.
- **NULL passes validation unconditionally** (unassign is always allowed).
- **Alternative considered:** client-side only. Rejected — server must be the source of truth.

### D3. Notification trigger lives inside the existing PATCH transaction

- **Why colocate:** the PATCH handler already runs a transaction that locks the issue row and inserts a notification for status change. Adding assignee notification here reuses the same lock and keeps the "write + notify" atomic.
- **Trigger condition:** `assigneeId` was provided in the request, resolved new assignee differs from the prior value, new assignee is non-null, and new assignee is not the acting user.
- **Payload:** `type: NotificationType.IssueUpdate`, `title: "Issue <PROJECT>-<NUMBER> assigned to you"`, `content: <issue title>`. Reusing `IssueUpdate` avoids a schema/enum migration for `NotificationType` and keeps the bell feed grouped by issue.
- **Unassign (→ NULL) emits no notification** — matches user requirement; nothing actionable to tell anyone.
- **Create-with-assignee also notifies** — same rules, handled in the POST handler (also inside its transaction if one exists; otherwise we add a small one so the issue+notification pair stays atomic).

### D4. Schema extension over new endpoint

- Add `assigneeId: z.uuid().nullish()` to `createIssueSchema` and `updateIssueSchema` rather than creating a dedicated `PATCH /assignee` endpoint.
- **Why:** reuses validation, response shape, and transactional write path. Keeps the API surface small.
- **Response:** extend the JSON response to include a nested `assignee: { id, name, email } | null` so the UI doesn't need a second request to render names. Resolved via a LEFT JOIN on `profiles` (also filters soft-deleted — assignee display falls back to "Unknown" if the profile is soft-deleted after assignment).

### D5. UI: dropdown powered by existing `GET /api/projects/:projectId/members`

- Add a composable `useProjectMembers(projectId)` (if not already present) using `useFetch` with a keyed cache so the list page, detail page, and form share the request.
- Form uses `USelect` (Nuxt UI) with members + an explicit "Unassigned" option (value `null`).
- The acting user's own profile appears in the list — self-assignment is allowed (it just doesn't ping the bell, per D3).

### D6. Migration strategy — simple additive migration, no data backfill

- Generate migration via `pnpm db:generate`; it should produce a single `ALTER TABLE` adding the nullable column, the FK, and the index.
- No backfill required (NULL = unassigned is the desired default for existing issues).
- Rollback: `ALTER TABLE issues DROP COLUMN assignee_id;` — safe because the column has no dependents outside this feature.

## Risks / Trade-offs

- **[Risk] Assignee displayed without profile (edge: profile soft-deleted between assign and render)** → Mitigation: API response resolves assignee via LEFT JOIN with the same `isNull(profiles.deletedAt)` filter used by `members.get.ts`; the client renders "Unknown user" when the join returns null but `assigneeId` is set.
- **[Risk] Member removed from project while still assigned** → Mitigation: accepted trade-off. The issue retains its `assignee_id`, but the assignee no longer has project access (so they can't see the issue). A follow-up could nullify `assignee_id` on member removal; out of scope here since member removal itself is not in the current UI.
- **[Risk] Notification spam on rapid reassignments** → Mitigation: one notification per PATCH that actually changes assignee; no debouncing needed because each PATCH is an explicit user action.
- **[Trade-off] Reusing `NotificationType.IssueUpdate` instead of a new `IssueAssigned` type** → Keeps migration footprint smaller and the UI doesn't need new copy handling. Downside: bell list groups assign/status together. Acceptable because the `title` disambiguates and both are issue-centric.
- **[Trade-off] No "assigned to me" filter in this change** → Keeps scope tight. The index on `assignee_id` leaves that cheap to add later.

## Migration Plan

1. Edit `server/database/schema/issues.ts` — add `assigneeId` column + index.
2. `pnpm db:generate` → review SQL → `pnpm db:migrate` locally → commit migration.
3. Ship schema + API + UI in one PR (feature is small enough; splitting would force the client to render against a schema that doesn't exist yet in staging).
4. Rollback: revert the PR and run the down-migration (drop column). No data loss since the column starts NULL.

## Open Questions

- Should the assignee dropdown also show soft-deleted profiles so the UI can render historical assignments faithfully? Current plan: no — `members.get.ts` already filters them out. If needed, we expand the issue response JOIN without touching the dropdown.
- Do we want a future `NotificationType.IssueAssigned` for better bell grouping? Tracked as a possible follow-up; not blocking.
