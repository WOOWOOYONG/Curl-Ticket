## Why

The CLI (`packages/cli`) is functional for basic read operations but lacks foundational quality-of-life features that affect daily usability: no pagination hints in human-readable mode, no request timeout/retry resilience, no project detail or creation commands, and no issue deletion capability. These are all independent, low-risk improvements that unblock heavier CLI features (like interactive issue creation) planned for Phase 2+.

## What Changes

- **Pagination hints** — human-readable output for `ct projects` and `ct issues` will display `Showing 1-10 of 42 (page 1/5)` so users know more data exists. JSON mode is unaffected (already includes `pagination` object).
- **Request timeout & retry** — `api-client.ts` gains configurable timeout via `CURL_TICKET_TIMEOUT` env var (default 30s), automatic retry on network errors (1 retry), and 429 rate-limit handling with `Retry-After` backoff.
- **Project management commands** — three new commands: `ct project <id>` (view project detail), `ct create-project --name --key [--description]` (create project), `ct members <id>` (list project members). All server APIs already exist.
- **Issue delete command** — `ct delete-issue <projectId> <issueId> [--force]` with interactive confirmation (skippable with `--force`). Server API already exists (`DELETE /api/projects/:projectId/issues/:issueId`). Currently hard-deletes; future soft-delete migration won't require CLI changes.

## Non-goals

- Interactive issue creation (Phase 3, `feat/cli-create-issue`)
- Comment query optimization (Phase 2, requires new server route)
- Issue soft-delete server migration (separate `feat/issue-soft-delete` change)
- Changes to JSON mode output structure (backwards compatible)

## Capabilities

### New Capabilities

- `cli-pagination-hint`: Display pagination summary in human-readable mode for list commands
- `cli-resilience`: Request timeout configuration and automatic retry for network errors and 429 responses
- `cli-project-commands`: Project detail view, project creation, and member listing from the CLI
- `cli-delete-issue`: Issue deletion command with interactive confirmation

### Modified Capabilities

_(none — all changes are additive CLI features with no spec-level changes to existing capabilities)_

## Impact

- **Code**: `packages/cli/src/` — `api-client.ts`, `constants.ts`, `types.ts`, `formatters.ts`, `index.ts`, plus new command files in `commands/`
- **APIs**: No server-side changes. All required endpoints already exist.
- **Dependencies**: No new npm dependencies needed (native `AbortSignal.timeout`, native `readline` for confirmation prompts)
- **PRD**: No existing PRD module updates required. These are CLI-specific enhancements not covered by current PRD modules.
