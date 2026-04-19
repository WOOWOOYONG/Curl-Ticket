## Context

The issue assignee feature (branch `feat/issue-assignee`) recently added `issues.assignee_id` and the write paths needed to set/clear it. Today, viewing one's assignments requires opening every project individually. Industry tools (GitHub, Linear, Jira) all solve this with a dedicated "assigned to me" surface — a sidebar page for the workbench, plus a dashboard summary for drive-by awareness.

Relevant current state:

- `server/middleware/auth.ts` already populates `event.context.userId` and `event.context.profile` for every non-public `/api/*` route.
- `server/utils/project-access.ts` exposes `buildProjectAccessCondition(userId)` returning a Drizzle SQL condition shared by every project-scoped query.
- `app/composables/useProjects.ts` is the reference pattern for reactive `useFetch` keys.
- `app/layouts/default.vue` builds `navItems` reactively from `profile.value?.role`.

## Goals / Non-Goals

**Goals:**

- Give users one consolidated cross-project view of their assignments.
- Keep API surface small: a single `GET /api/me/issues` returning `data + pagination + summary` so the page, sidebar badge, and dashboard block all consume the same endpoint.
- Reuse existing access-control primitives; no new auth concepts.
- Stay within current stack conventions (Zod in `shared/schemas/`, composables in `app/composables/`, pages under `app/pages/`, Nuxt UI for components).

**Non-Goals:**

- No new DB columns or migrations.
- No new notification types.
- No saved-view persistence — filter state lives in URL query params only.
- No bulk actions from `/my-issues`.

## Decisions

### Decision 1: One endpoint carries list + summary

**Choice**: `GET /api/me/issues` returns `{ data, pagination, summary }` in a single call. `summary` counts ignore list-filters (status/projectId/environment/search).

**Why**: The dashboard block and sidebar badge need stable counts; if `summary` respected list filters, applying a `status=Open` filter would collapse the badge to zero. Keeping them unfiltered matches how `useProjects` already exposes aggregate `summary` alongside a paginated `data`.

**Alternative considered**: Split into `/api/me/issues` (list) and `/api/me/issues/summary` (counts). Rejected for now — doubles request count on page load without real benefit. Can be split later if the summary query grows expensive.

### Decision 2: Hide `Close` by default, but still count it in summary

**Choice**: When `status` query is omitted, list excludes `IssueStatus.Close`; `summary.close` still reports the true count.

**Why**: Matches how GitHub hides closed issues by default but keeps the "Closed" tab counter visible. Users rarely want closed issues cluttering their workbench.

### Decision 3: Access gating via join, not per-row check

**Choice**: The SQL JOINs `projects` and applies `buildProjectAccessCondition(userId)` in the `WHERE` clause, so unauthorized issues never leave the database.

**Why**: Cheaper than post-filtering, and consistent with existing project-scoped routes. Ensures revoked-access projects drop out automatically without bespoke code.

### Decision 4: Reactive composable matches `useProjects`

**Choice**: `useMyIssues(options: Ref<MyIssuesOptions>)` uses `useFetch` with a computed key built from `options.value`, exactly like `useProjects`.

**Why**: Preserves SSR-friendly fetch semantics and reuses the mental model already present in the codebase. A second lightweight `useMyIssuesSummary()` may call the same endpoint with `pageSize=1` to get the `summary` block cheaply for layout-level use (sidebar badge).

### Decision 5: Filter state in URL query, not local ref

**Choice**: Filters on `/my-issues` are two-way bound with route query params.

**Why**: Users can bookmark and share filtered views, and back-button behavior is natural. Costs one extra `watch` but removes a whole class of state-sync bugs.

### Decision 6: Sidebar placement — between Projects and Admin

**Choice**: Insert `{ to: '/my-issues', icon: 'i-lucide-inbox', label: 'My Issues' }` right after the Projects entry, before any admin entry is conditionally pushed.

**Why**: Linear puts "My Issues" first, but in this app **Projects** is the primary workspace entry and users expect it at the top. "My Issues" second preserves primary navigation while keeping the workbench one click away.

### Decision 7: No DB index right now

**Choice**: Ship without adding an index on `(assignee_id, status)`.

**Why**: Assignee cardinality is low per user and current datasets are small. Measure first, index later. Noted in Risks.

## Risks / Trade-offs

- **[Risk]** Query could slow down on large teams/datasets because it JOINs `issues` × `projects` with no dedicated index → **Mitigation**: Revisit with an index on `issues(assignee_id, status)` and/or `issues(assignee_id, updated_at DESC)` once there is production signal. Add a slow-query log item in the follow-up ticket.
- **[Risk]** Summary that ignores filters could feel inconsistent if users expect the badge to reflect the current view → **Mitigation**: Keep badge semantics clearly documented; sidebar badge copy says "open + in-progress", not "results", so the contract is unambiguous.
- **[Risk]** Users with no assignments see a noisy empty page → **Mitigation**: Two distinct empty states (zero total vs. zero-after-filter); dashboard block hides itself when count is zero.
- **[Risk]** Soft-delete semantics for issues might not exist uniformly yet → **Mitigation**: The endpoint filters by whatever soft-delete column the `issues` table uses (inspect schema at implementation time); if no soft-delete exists yet, the scenario is still satisfied trivially.
- **[Trade-off]** Single endpoint means the dashboard block re-fetches on every Dashboard mount. Acceptable given Nuxt's `useFetch` cache; revisit only if profiling shows a hotspot.

## Migration Plan

1. Ship behind no flag — endpoint + page + sidebar + dashboard block land together.
2. No data migration required (column already exists from the assignee feature).
3. Rollback: revert the PR; no schema changes to undo.
4. Follow-up ticket: consider `(assignee_id, status)` index if p95 latency exceeds budget.

## Open Questions

- Should `/my-issues` also surface issues where the caller is the *reporter* (creator) even without an assignee? Out of scope for this change; track as a separate proposal if asked.
- Should sidebar badge poll or rely on page navigation to refresh? Start with on-navigation refresh; revisit if users report staleness.
