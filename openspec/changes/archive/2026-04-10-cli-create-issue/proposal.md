## Why

The CLI (`ct`) currently supports listing, viewing, updating status, and deleting issues, but cannot **create** them. Users must switch to the web UI to file new issues, breaking their terminal workflow. Adding `ct create-issue` closes this gap and is especially valuable for API Bug issues — engineers can pipe a cURL command directly from their terminal into a new issue without context-switching.

## What Changes

- **New `create-issue` command** with two modes based on issue type:
  - `--type api_bug --curl "..."` — parses the cURL via `POST /api/curl/parse`, then creates the issue with the parsed request data
  - `--type task` — interactive guided flow (gh issue create style): prompt for title → gate ("Create now / Add details / Cancel") → optional Why + Goal → preview → confirm
- **Non-interactive mode** for CI/scripting: `--title "..." [--description "..."]` bypasses all prompts
- **New API client methods** on `CurlTicketClient`: `parseCurl(curl)` and `createIssue(projectId, data)`
- **JSON output support** (`--json`) consistent with other commands

## Non-goals

- No file-upload or multi-part body support for cURL parsing
- No editing of parsed cURL fields before creation (user can update after creation via web UI)
- No environment auto-detection — user must pass `--env` explicitly for API Bug issues
- No SDD (Spec-Driven Development) integration — the command creates concise issues; detailed specs remain a developer choice outside the CLI

## Capabilities

### New Capabilities

- `cli-create-issue`: Covers the `ct create-issue` command, including API Bug mode (cURL parsing + creation), Task mode (interactive guided flow), non-interactive mode, argument validation, and JSON output.

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- **CLI package** (`packages/cli/`): new command file, updated `index.ts` registration, new API client methods, new types for create-issue input/response and cURL parse response
- **Server APIs used**: `POST /api/curl/parse` (existing), `POST /api/projects/:projectId/issues` (existing) — no server changes needed
- **Dependencies**: no new npm dependencies — interactive prompts use Node.js built-in `readline` (already used by `confirm()` in `utils.ts`)
- **Shared schemas**: `createIssueSchema` from `shared/schemas/issue.ts` informs the CLI input shape, but validation runs server-side; CLI does lightweight pre-validation
