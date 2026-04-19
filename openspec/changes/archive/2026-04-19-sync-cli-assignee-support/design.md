## Context

Two capabilities recently landed in the web app and are already deployed server-side:

- `issue-assignee` — `issues.assigneeId` column, validation that assignees must be project owners/members, and an `assignee` object embedded in every issue response.
- `my-issues` — `GET /api/me/issues` with rich filters (`status` repeatable, `projectId`, `environment`, `search`, `sort`, `order`, `page`, `pageSize`), a `summary` block that ignores list filters, and supporting UI (sidebar, dashboard block, `/my-issues` page).

The CLI (`packages/cli`) and the shipped agent Skill (`packages/cli/skills/curl-ticket/SKILL.md`) predate these features. CLI list/detail output strips the `assignee` field, there's no way to assign an issue, no way to filter by assignee, and no way to surface "my issues" — so terminal users and coding agents operating through the Skill can't participate in the new triage workflow.

No backend work is required. This change is purely on the CLI side: HTTP client additions, two new commands, additive flags on two existing commands, type/formatter updates, and a Skill refresh.

## Goals / Non-Goals

**Goals:**

- Parity with the web app's assignee capabilities: agents and humans using the CLI can read, set, and filter by assignee.
- A `my-issues` command that maps 1:1 onto the `GET /api/me/issues` contract including its summary block.
- An `assign` command that is short, unambiguous, and supports `me` / `none` shortcuts so agents don't need to resolve UUIDs before calling it.
- Keep the Skill actionable — update commands, JSON samples, and workflow guidance so agents self-serve without reading source.
- Preserve existing CLI output shape (no breaking changes to JSON keys already in use).

**Non-Goals:**

- No changes to server APIs, Zod schemas, or DB.
- No changes to the web app.
- No CLI i18n work — CLI strings stay English only.
- No new auth surfaces (all new endpoints reuse the existing bearer token).
- No notifications or webhooks.

## Decisions

### Assignee input resolution (`me` / `none` / email / UUID)

Both `create-issue --assignee` and the new `assign` command accept a single positional/flag value. Resolution order:

1. `none` / `null` / empty string → `assigneeId: null` (unassign).
2. `me` → resolve to caller's `userId` by calling `GET /api/auth/me` (or cache the value from the local auth config once fetched). Preferred over duplicating identity lookups client-side.
3. Looks like a UUID (regex) → pass through as `assigneeId`.
4. Contains `@` → treat as email; call `GET /api/projects/:projectId/members`, find the matching email case-insensitively, use its `userId`. Error if not found.
5. Otherwise → validation error listing the accepted forms.

**Alternatives considered:** separate `--assignee-email` / `--assignee-id` flags. Rejected — doubles the API surface and makes the Skill docs noisier. A single resolver covers 95% of ergonomic cases; agents can always pass a raw UUID when precision matters.

### `GET /api/auth/me` for `me` shortcut

Used only to resolve `me` on demand. Cached in-memory per CLI invocation. Not persisted to the auth config file (keeps the token file schema unchanged). If `/api/auth/me` ever returns a shape we don't expect, surface a validation error asking the user to pass a UUID explicitly.

### `my-issues` command shape

```
curl-ticket my-issues --json \
  [--status <Open|In Progress|Done|Close>]... \
  [--project <projectId>] [--environment <Local|Dev|Staging|Prod>] \
  [--search <q>] \
  [--sort <updatedAt|createdAt|status>] [--order <asc|desc>] \
  [--page <n>] [--page-size <n>]
```

- `--status` uses Commander's variadic collection pattern (`-s` repeats); each value passes through `normalizeStatus`.
- Default server behavior (exclude `Close`, sort by `updatedAt desc`, pageSize 20) is preserved by sending no query params when flags are omitted.
- Human-readable mode prints the summary counts line (`Open N · In Progress N · Done N · Close N · Total N`) then issue rows; JSON mode returns `{ data, pagination, summary }` verbatim.

**Alternative considered:** put this under `curl-ticket me issues`. Rejected — the existing CLI is flat (no subcommand groups for data commands) and Skill agents parse positional slots naively. A top-level `my-issues` keeps grep-ability.

### `assign` command vs. extending `update-status`

Kept separate as `curl-ticket assign <projectId> <issueId> <assignee>`. Rationale:

- `update-status` has a narrow contract (one field), and stuffing an orthogonal field in would break the mental model agents already have from the Skill.
- A dedicated `assign` command documents itself and pairs naturally with the existing `update-status` pattern.
- The PATCH endpoint accepts partial updates, so this is a thin wrapper around `client.request(..., { method: 'PATCH', body: { assigneeId } })`.

Both `--dry-run` support and JSON mode mirror `update-status` for consistency.

### Type extensions

Add to `IssueSummary`:

```ts
assigneeId: string | null
assignee: { id: string; name: string | null; email: string } | null
```

Same fields appear on `IssueDetail` (extends `IssueSummary`). Existing consumers keep working because fields are additive.

### Formatter display rule

- If `assignee?.name` present → show name.
- Else if `assignee?.email` present → show email.
- Else → show `Unassigned` (capital U, matches the UI copy).

Applied in `formatIssueSummary` (list), `formatIssueDetail` (detail), and the new `my-issues` formatter.

### Schema command

`schemaCommand()` currently prints a JSON blob of all commands/flags/enums for agent introspection. It must include:

- The `my-issues` command with its flags and enum values.
- The `assign` command.
- The `--assignee` flag on `issues` and `create-issue`.
- `assigneeId` and `assignee` in the `ISSUE_FIELDS` list used for `--fields`.

### Skill update scope

- Add the new commands to the "CLI Commands" quick-reference block.
- Document the `me` / `none` / email / UUID resolution rules in one short paragraph (agents need this to avoid hallucinating IDs).
- Add `assignee` to the JSON sample for single-resource responses.
- Add a "My assignments" section to the Analysis Workflow that starts with `curl-ticket my-issues --json -s Open` instead of `issues <projectId>`.
- Bump version note if the Skill carries one (it currently doesn't — no action).

## Risks / Trade-offs

- **`me` resolution adds a round trip.** → Cache in-memory per invocation; only called when a command actually uses `me`.
- **Email-to-userId lookup via members list could be stale** if the user was just added. → Caller can always pass a UUID; error message points at this.
- **CLI version bump is required for the npm package.** → Document in tasks; CI publishes on `cli@x.x.x` tag per `CLAUDE.md`.
- **Additive JSON fields could theoretically break strict JSON schema consumers.** → None exist today; the CLI response is passthrough from the server which already returns these fields.
- **Schema command is consumed by the Skill's first-run introspection.** → Landing new commands in `schema` output is the single source of truth; keep it in lockstep with actual command registration in `src/index.ts`.

## Migration Plan

1. Implement, run `pnpm typecheck` + `pnpm lint`.
2. Add/update unit tests in `packages/cli/src/__tests__/` for command parsing and resolver.
3. Merge to `main` behind a version bump (`cli@x.y.z`) per the repo's CLI release flow.
4. CI tag push → `npm publish`.
5. Users pick up via `npm i -g curl-ticket` or `pnpm dlx`.
6. Skill is bundled in the CLI package (`packages/cli/skills/curl-ticket/SKILL.md`) and ships with the same version bump — no separate rollout.

Rollback: revert the CLI commit and publish a patch release. No server state is touched.

## Open Questions

- Should the `issues` list command also support `--my` as a quick alias for `--assignee me`? Current plan: no, prefer the dedicated `my-issues` command so the summary block is available. Revisit if user feedback suggests agents try `issues --my` naturally.
- Does `GET /api/auth/me` exist and return `{ id, email, name }`? Need to confirm during implementation. If not, add a minimal endpoint or have the CLI carry the user id in its auth config file.
