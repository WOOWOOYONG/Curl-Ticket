## 1. Shared schema

- [x] 1.1 Create `shared/schemas/me-issues.ts` with `myIssuesQuerySchema` (status multi, projectId uuid, environment, search, sort, order, page, pageSize) and response types (`MyIssueListItem`, `MyIssuesSummary`, `MyIssuesResponse`).
- [x] 1.2 Re-export new types from `shared/schemas/index.ts` if that barrel exists; otherwise skip.

## 2. API endpoint

- [x] 2.1 Create `server/api/me/issues/index.get.ts`; read `userId` from `event.context.userId`, parse query with `myIssuesQuerySchema.safeParse`, return `badRequest()` on failure.
- [x] 2.2 Build Drizzle query: `issues` JOIN `projects` ON `projects.id = issues.project_id`, WHERE `issues.assignee_id = :userId` AND `buildProjectAccessCondition(userId)` AND (soft-delete exclusion if column exists) AND optional filters.
- [x] 2.3 When `status` query is absent, add `status <> 'Close'` to list query (but not summary query).
- [x] 2.4 Compute `summary` via a separate aggregate query grouped by status (ignores list filters); shape: `{ open, inProgress, done, close, total }`.
- [x] 2.5 Apply `sort`/`order` (whitelist: updatedAt | createdAt | status) and pagination (`page`, `pageSize`, max 50); return `{ data, pagination, summary }`.
- [x] 2.6 Ensure the route is NOT added to `publicRoutes` / `authOnlyRoutes` in `server/middleware/auth.ts` — requires full profile.

## 3. Composables

- [x] 3.1 Create `app/composables/useMyIssues.ts` with `useMyIssues(options: Ref<MyIssuesOptions>)` mirroring `useProjects` (reactive `useFetch` key from options).
- [x] 3.2 Add `useMyIssuesSummary()` in the same file — light `useFetch` to `/api/me/issues?pageSize=1` returning only `summary`, suitable for layout/dashboard.

## 4. Page

- [x] 4.1 Create `app/pages/my-issues.vue` with `<script setup>` and `UDashboardPanel`; bind filter state to route query params (status[], projectId, environment, sort, order, search, page).
- [x] 4.2 Render four summary cards (Open / In Progress / Done / Total) fed by `summary`.
- [x] 4.3 Render filter toolbar: status multi-select (USelectMenu), project filter (populate from distinct projects in current data or a `useProjects` call), environment select, sort select, search input with `refDebounced`.
- [x] 4.4 Render list rows with columns: project key badge, `#<issueNumber>`, title (truncate), status badge, environment, `useTimeAgo(updatedAt)`; click navigates to `/projects/:projectId/issues/:issueId`.
- [x] 4.5 Render two distinct empty states: zero-total and zero-filtered-results (latter shows a "Reset filters" button).
- [x] 4.6 Render `UPagination` using `pagination`.
- [x] 4.7 Add loading skeleton matching existing Dashboard aesthetic.

## 5. Sidebar integration

- [x] 5.1 Modify `app/layouts/default.vue` to insert `{ to: '/my-issues', icon: 'i-lucide-inbox', label: 'My Issues' }` in `navItems` after Projects and before the conditional Admin entry.
- [x] 5.2 (Optional) Call `useMyIssuesSummary()` in layout; render a numeric badge on the My Issues button when `summary.open + summary.inProgress > 0`.
- [x] 5.3 Verify `isActive()` highlights the entry when route starts with `/my-issues`.

## 6. Dashboard summary block

- [x] 6.1 Edit `app/pages/index.vue` to add an "Assigned to me" section between the four stat cards and the Projects overview.
- [x] 6.2 Use `useMyIssues` with `pageSize=5` + `sort=updatedAt`; render total + up to 5 recent rows; include a "View all →" link to `/my-issues`.
- [x] 6.3 Hide the block (or collapse to an empty hint) when the caller has zero assignments.

## 7. i18n

- [x] 7.1 Add `myIssues.*` keys (title, subtitle, summary labels, filter labels, empty states, viewAll, badgeLabel) to `i18n/locales/en.json` and `i18n/locales/zh-TW.json`.
- [x] 7.2 Replace hardcoded strings in page/sidebar/dashboard block with `$t(...)`.

## 8. Docs

- [x] 8.1 Update `docs/prd/issues.md` with an "Assigned to me view" subsection referencing ISSUE-* requirement IDs where relevant.
- [x] 8.2 Cross-reference the new section from `docs/prd/README.md`.

## 9. Verification

- [x] 9.1 Run `pnpm lint` and fix issues.
- [x] 9.2 Run `pnpm typecheck` and fix issues.
- [x] 9.3 Manual smoke: assign an issue to self, verify it appears in `/my-issues`, filters work, sidebar entry highlights, dashboard block shows it, leaving the project's membership removes it from the list, closing it hides it by default but keeps `summary.close` accurate.
