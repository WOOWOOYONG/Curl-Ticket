## Context

The CLI (`packages/cli/`) is a standalone npm package built with Commander.js. It currently supports read, update-status, and delete operations on issues, but has no create-issue command. The web UI creates issues via `POST /api/projects/:projectId/issues` (with cURL parsing via `POST /api/curl/parse`). Both server endpoints already exist and need no modification — the CLI will be a new consumer.

Existing CLI patterns:
- Each command is a standalone function in `src/commands/<name>.ts`, taking `(client, ...args, json)` as parameters
- Commands are registered in `src/index.ts` with Commander.js, wrapped by `withAuth()` and `handleError()`
- Interactive prompts use Node.js `readline` (see `confirm()` in `utils.ts`)
- API calls go through `CurlTicketClient` methods in `api-client.ts`
- Output follows a dual mode: human-readable (default) or `--json` raw output

## Goals / Non-Goals

**Goals:**
- Add `ct create-issue <projectId>` command with `--type api_bug|task`
- API Bug mode: accept `--curl "..."`, parse it server-side, create the issue with parsed data
- Task mode: interactive guided flow (title → gate → optional details → preview → confirm)
- Non-interactive mode: `--title "..." [--description "..."]` for scripting/CI
- Consistent `--json` output matching other commands
- Proper validation and error handling following existing patterns

**Non-Goals:**
- No editing of parsed cURL fields before issue creation
- No file upload or multi-part body support
- No environment auto-detection (explicit `--env` flag)
- No new npm dependencies

## Decisions

### 1. Command signature design

```
ct create-issue <projectId> [--type <api_bug|task>] [options]
```

**Rationale:** Follows existing patterns (`ct delete-issue <projectId> <issueId>`). `projectId` is a positional argument because it's always required. `--type` is optional — when omitted in an interactive terminal, the CLI prompts the user to select between `API Bug` and `Task` via a numbered menu. This keeps the interactive experience smooth (no need to remember flags) while still supporting explicit `--type` for scripting.

**Alternatives considered:**
- Subcommands (`ct create-issue api-bug <projectId>`) — rejected because it diverges from the flat option pattern used by `--status` and `--type` in `issues` command
- `--type` always required — rejected because interactive selection provides a better UX for terminal users; non-interactive mode still requires explicit `--type`

### 2. API Bug flow: parse then create (two API calls)

For `--type api_bug --curl "..."`:
1. Call `POST /api/curl/parse` with the raw cURL string → receive `{ url, method, headers, body }`
2. Call `POST /api/projects/:projectId/issues` with the parsed data + auto-generated title

**Rationale:** Reuses the existing server-side parsing. The server already uses `curlconverter` which handles edge cases (quoted strings, escaped chars, multi-line). No need to replicate this logic in the CLI.

**Auto-generated title:** `<METHOD> <url_path>` (e.g., `POST /api/users`). User can override with `--title`.

### 3. Task flow: gated interactive prompts using readline

Follows the `gh issue create` style gate pattern:

```
Title: _______________
What's next?
  > Create now
    Add details
    Cancel
```

If "Add details" is selected:
```
Why (motivation): _______________
Goal (expected outcome): _______________
```

Then compose a Markdown description:
```markdown
## Why
<user input>

## Goal
<user input>
```

Preview the composed issue, then confirm creation.

**Rationale:** Uses Node.js built-in `readline` (already a dependency pattern in `utils.ts`). No need for `inquirer` or `prompts` — keeps the CLI dependency-free. The gate pattern prevents unnecessary prompts while still offering detail for those who want it.

**Implementation:** Create a `promptInput(question)` helper alongside the existing `confirm()` in utils, and a `promptSelect(question, choices)` for the gate menu.

### 4. Non-interactive mode detection

If `--title` is provided (and `--type` for task), skip all interactive prompts. For API Bug + `--curl`, auto-generate title from parsed data unless `--title` is explicitly provided.

If stdin is not a TTY (piped input), also skip interactive prompts — fail with a clear error if required info is missing (`--type` and `--title`).

**Rationale:** Enables scripting: `ct create-issue $PID --type task --title "Fix login bug"`. TTY detection prevents hangs in CI pipelines.

### 5. File structure

```
packages/cli/src/
  commands/
    create-issue.ts       # Command handler (orchestrates flow)
  api-client.ts           # Add parseCurl() and createIssue() methods
  types.ts                # Add CreateIssueInput, ParseCurlResponse types
  utils.ts                # Add promptInput(), promptSelect() helpers
```

Single command file, not split by type — the branching logic is straightforward enough to keep in one file.

### 6. CLI option mapping

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `<projectId>` | positional | yes | — | Target project UUID |
| `--type <type>` | option | no (prompted if omitted) | — | `api_bug` or `task` |
| `--curl <curl>` | option | api_bug only | — | Raw cURL command string |
| `--title <title>` | option | no | auto-gen for api_bug | Issue title |
| `--description <desc>` | option | no | — | Issue description (Markdown) |
| `--env <env>` | option | no | `Dev` | Environment (api_bug only) |
| `--status <status>` | option | no | `Open` | Initial issue status |

## Risks / Trade-offs

**[Risk] Long cURL strings may cause shell quoting issues** → Users should wrap cURL in single quotes. Document this in the command help text. The CLI receives the already-parsed shell argument, so double-quoting within the cURL is preserved.

**[Risk] Interactive prompts block in non-TTY environments** → Mitigated by TTY detection: if `!process.stdin.isTTY` and required input is missing, exit with a clear error message instead of hanging.

**[Risk] Large request/response bodies in cURL** → No CLI-side size limit; the server API handles validation. The CLI just forwards the parsed data.

**[Trade-off] No pre-creation field editing for API Bug** → Keeps the flow simple (parse → create). Users who need to modify fields can use the web UI after creation. The printed result includes the issue URL/ID for quick access.
