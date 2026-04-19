## Why

The web app recently shipped two capabilities — `issue-assignee` (per-issue `assigneeId` with owner/member validation) and `my-issues` (`GET /api/me/issues` + dashboard/sidebar surfaces). The CLI and the `curl-ticket` Skill are still blind to assignees: agents can't filter by assignee, can't assign/reassign when creating or updating issues, can't list "issues assigned to me," and the Skill's guidance never mentions assignees. This leaves terminal users and coding agents unable to drive the same triage workflow the UI now supports.

## What Changes

- Extend CLI list/detail output to surface `assignee` (id + name/email fallback, or `Unassigned`).
- Add `--assignee <userId|email|me|none>` to `create-issue` so api_bug/task flows can set `assigneeId` on creation.
- Add a new `assign` command: `curl-ticket assign <projectId> <issueId> <assignee>` that PATCHes `assigneeId` (supports `me`, `none`/`null`, email, or UUID; resolves via `members` where needed).
- Add `--assignee` filter to `issues <projectId>` — accepts `me`, `none`, email, or UUID — forwarded as a query param on `GET /api/projects/:projectId/issues`.
- Add a new top-level `my-issues` command consuming `GET /api/me/issues`, with flags mirroring the API (`--status` repeatable, `--project`, `--environment`, `--search`, `--sort`, `--order`, `--page`, `--page-size`). Output includes the summary counts.
- Update `CurlTicketClient` with `getMyIssues()`, `updateIssueAssignee()`, and extend `getIssues()`/`createIssue()` to pass assignee parameters.
- Extend `IssueSummary`/`IssueDetail` types with `assigneeId` and `assignee` fields.
- Update `schema` command output so agents can introspect the new commands, flags, and fields.
- Update `packages/cli/skills/curl-ticket/SKILL.md` to document the new commands, the `me` shortcut, the `my-issues` workflow, and the `assignee` field in JSON samples.

## Capabilities

### New Capabilities

- `cli-my-issues`: CLI `my-issues` command surfacing `GET /api/me/issues` with full filter/pagination/summary support.
- `cli-assign-issue`: CLI `assign` command for changing an issue's assignee, including `me` / `none` shortcuts.

### Modified Capabilities

- `cli-create-issue`: add `--assignee` option and include `assigneeId` in the create payload.
- `cli-project-commands`: add `--assignee` filter to `issues`, render assignee in list/detail output, and surface `assignee` on responses.

## Impact

- **Code**: `packages/cli/src/api-client.ts`, `packages/cli/src/types.ts`, `packages/cli/src/commands/{issues,issue,create-issue,schema}.ts`, new `packages/cli/src/commands/{assign,my-issues}.ts`, `packages/cli/src/index.ts`, `packages/cli/src/formatters.ts`, `packages/cli/src/utils.ts`, `packages/cli/src/constants.ts`.
- **Skill**: `packages/cli/skills/curl-ticket/SKILL.md` updated (commands, JSON samples, workflow).
- **APIs consumed**: `GET /api/me/issues` (new), `PATCH /api/projects/:projectId/issues/:issueId` (now accepts `assigneeId`), `GET /api/projects/:projectId/issues` (now returns/filters by assignee), `POST /api/projects/:projectId/issues` (accepts `assigneeId`), `GET /api/projects/:projectId/members` (used to resolve email → userId).
- **No backend changes** — endpoints already exist from the archived `add-issue-assignee` and `add-my-issues-page` changes.
- **PRD**: `docs/prd/cli.md` (if present) should be updated to document the new surface; no other PRD modules affected.
- **Non-goals**: no changes to web UI, no changes to API contracts, no i18n changes to the CLI (English only), no notification/webhook work.
