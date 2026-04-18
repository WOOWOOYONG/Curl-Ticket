## ADDED Requirements

### Requirement: List Assigned Issues API

The system SHALL expose `GET /api/me/issues` returning every non-deleted issue where `assignee_id` equals the authenticated user's id and the issue belongs to a project the user currently has access to (owner or `project_members` row).

The endpoint MUST support the following query parameters, all optional:

- `status` — repeatable; each value MUST be a member of `IssueStatus`. When omitted, the server SHALL default to excluding `IssueStatus.Close`.
- `projectId` — UUID; restricts results to a single project.
- `environment` — member of `Environment`.
- `search` — case-insensitive substring match on issue `title`.
- `sort` — one of `updatedAt`, `createdAt`, `status`. Defaults to `updatedAt`.
- `order` — `asc` | `desc`. Defaults to `desc`.
- `page` — positive integer. Defaults to `1`.
- `pageSize` — positive integer, max `50`. Defaults to `20`.

The response body MUST be:

```
{
  data: Array<{
    id, issueNumber, title, status, environment,
    assigneeId, updatedAt, createdAt,
    project: { id, key, name }
  }>,
  pagination: { page, pageSize, total, totalPages },
  summary: { open, inProgress, done, close, total }
}
```

The `summary` counts SHALL reflect the unfiltered total of assigned issues (ignoring `status`, `projectId`, `environment`, `search`, `page`, `pageSize`) so the dashboard / sidebar badge stays stable while users filter the list.

Invalid query parameters SHALL produce a `400 Bad Request` via `badRequest()`. Unauthenticated requests SHALL be rejected by the existing `server/middleware/auth.ts` (403 when no profile, 401 when no session).

#### Scenario: Returns only issues assigned to the caller

- **WHEN** an authenticated user with profile calls `GET /api/me/issues`
- **THEN** the response `data` contains only issues whose `assignee_id` equals that user's id
- **AND** issues assigned to other users are excluded

#### Scenario: Excludes issues in projects the user no longer has access to

- **WHEN** the user was previously assigned an issue in project P
- **AND** the user is no longer a member or owner of project P
- **THEN** issues from project P MUST NOT appear in the response

#### Scenario: Soft-deleted issues are excluded

- **WHEN** an assigned issue has been soft-deleted
- **THEN** it MUST NOT appear in `data` and MUST NOT be counted in `summary`

#### Scenario: Default filter hides closed issues

- **WHEN** the user calls the endpoint without a `status` parameter
- **THEN** issues with `status = Close` MUST NOT appear in `data`
- **BUT** `summary.close` MUST still reflect the true count of closed assigned issues

#### Scenario: Status filter accepts multiple values

- **WHEN** the user calls `GET /api/me/issues?status=Open&status=In Progress`
- **THEN** only issues with `status` in `{Open, In Progress}` MUST be returned in `data`

#### Scenario: Invalid query parameter

- **WHEN** the user supplies `pageSize=500` or an unknown `status`
- **THEN** the server SHALL respond `400 Bad Request` with a descriptive message

#### Scenario: Pagination metadata

- **WHEN** total assigned (matching filters) is 47 and the user requests `page=2&pageSize=20`
- **THEN** `data.length` MUST be `20`, `pagination.page` MUST be `2`, `pagination.total` MUST be `47`, `pagination.totalPages` MUST be `3`

#### Scenario: Summary ignores list filters

- **WHEN** the user calls `GET /api/me/issues?status=Open`
- **THEN** `summary` MUST reflect counts across all statuses (open, inProgress, done, close, total), not only `Open`

### Requirement: Assignee Derived From Session

The `assigneeId` used for filtering MUST come from `event.context.userId` set by the auth middleware. The endpoint MUST NOT accept an `assigneeId` query parameter or allow any caller-supplied override to impersonate another user.

#### Scenario: Query cannot override assignee

- **WHEN** the user sends `GET /api/me/issues?assigneeId=<other-user-id>`
- **THEN** the server MUST ignore the query parameter
- **AND** the response MUST contain only issues assigned to the caller

### Requirement: My Issues Page

The system SHALL provide an authenticated page at `/my-issues` that consumes `GET /api/me/issues` to display the caller's assignments across all accessible projects.

The page MUST provide:

- Summary cards for `Open`, `In Progress`, `Done`, and `Total` counts sourced from `summary`.
- A filter toolbar supporting `status` (multi), `projectId`, `environment`, `sort`, and title `search`.
- A paginated list with columns: project key, issue number (`#<issueNumber>`), title, status badge, environment, and relative updated timestamp.
- A distinct empty state when the caller has zero assignments at all, versus a "no results" state when filters exclude everything.

Clicking a row MUST navigate to `/projects/:projectId/issues/:issueId`.

The page MUST be reachable only by authenticated users with a profile; unauthenticated access MUST redirect or 403 via existing middleware.

#### Scenario: User has assignments

- **WHEN** an authenticated user with at least one assigned issue visits `/my-issues`
- **THEN** the page renders summary cards, the filter toolbar, and the list with their assigned issues

#### Scenario: User has no assignments at all

- **WHEN** the user has zero rows from the endpoint (no filters applied)
- **THEN** the page renders a zero-state illustration explaining nothing is assigned to them

#### Scenario: Filters exclude everything

- **WHEN** the user applies filters that match no issues, but has assignments otherwise
- **THEN** the page renders a "no results match these filters" state with a clear action to reset filters

#### Scenario: Row click navigation

- **WHEN** the user clicks a list row for issue `I` in project `P`
- **THEN** the app navigates to `/projects/<P.id>/issues/<I.id>`

### Requirement: Sidebar Entry

The main application layout SHALL expose a "My Issues" entry in the left sidebar with icon `i-lucide-inbox`, placed between the "Projects" entry and any admin-only entries.

The entry MAY display a numeric badge equal to `summary.open + summary.inProgress` when greater than zero.

The entry MUST be rendered for every authenticated user with a profile — visibility MUST NOT depend on admin role.

#### Scenario: Entry is visible to non-admin users

- **WHEN** a regular user with a profile loads any page using the default layout
- **THEN** the "My Issues" sidebar entry is visible

#### Scenario: Active state while on `/my-issues`

- **WHEN** the current route starts with `/my-issues`
- **THEN** the sidebar entry MUST render in the active/selected visual state

### Requirement: Dashboard Summary Block

The dashboard page (`/`) SHALL render an "Assigned to me" section that shows the caller's total open+in-progress count and up to 5 most recently updated assignments, with a "View all" link to `/my-issues`.

The block MUST be omitted (or render the empty state) when the caller has zero assignments.

#### Scenario: Caller has assignments

- **WHEN** the user loads `/` and has at least one assigned issue
- **THEN** the dashboard renders the "Assigned to me" block showing up to 5 recent assignments and a link to `/my-issues`

#### Scenario: Caller has no assignments

- **WHEN** the user has zero assigned issues
- **THEN** the dashboard either hides the block or shows a compact empty hint, but MUST NOT render the recent list
