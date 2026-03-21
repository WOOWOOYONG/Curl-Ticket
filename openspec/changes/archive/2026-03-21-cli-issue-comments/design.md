## Context

The CLI (`packages/cli/`) is a standalone npm package built with Commander.js. It currently has 4 data commands (`projects`, `issues`, `issue`, `update-status`) that communicate with the Nuxt server via a `CurlTicketClient` class. All commands support `--json` output for AI agent consumption, and a `schema` command exposes the command catalog for agent introspection.

The server already has full comment CRUD endpoints:
- `GET /api/projects/:projectId/issues/:issueId/comments`
- `POST /api/projects/:projectId/issues/:issueId/comments`
- `PATCH /api/projects/:projectId/issues/:issueId/comments/:commentId`
- `DELETE /api/projects/:projectId/issues/:issueId/comments/:commentId`

The CLI just needs to be extended to call these endpoints, with matching docs and skill updates.

## Goals / Non-Goals

**Goals:**
- Add 5 CLI commands covering comment CRUD (list, get, create, update, delete)
- Follow existing CLI patterns exactly (withAuth, --json, error handling, exit codes)
- Update `schema` command so agents can discover comment commands
- Update `README.md` with command reference for comment commands
- Update `SKILL.md` with comment workflow guidance for AI agents

**Non-Goals:**
- No server-side API changes
- No HTML rendering — strip/ignore HTML tags, output plain text
- No interactive comment editing (e.g., opening $EDITOR)
- No pagination for comments (the server returns all comments for an issue)

## Decisions

### 1. Command naming: verb-noun flat commands vs. subcommand group

**Decision:** Use flat verb-noun commands (`add-comment`, `edit-comment`, `delete-comment`) plus noun commands (`comments`, `comment`) — consistent with existing `update-status` pattern.

**Alternative considered:** `comment list|add|edit|delete` subcommand group. Rejected because the existing CLI uses flat commands (`update-status`, not `issue update-status`), and changing the pattern would be inconsistent.

### 2. Content input: positional arg vs. --content flag

**Decision:** Use a positional argument for content in `add-comment` and `edit-comment` (e.g., `ct add-comment <projectId> <issueId> "my comment"`).

**Alternative considered:** `--content` flag or stdin piping. Positional is simpler for agent usage and matches how agents typically invoke CLI tools. The content is validated by the server (1-5000 chars via Zod schema).

### 3. Comment ID resolution: numeric ID only

**Decision:** Comments use numeric IDs only (no friendly ID like issues have with `CT-42`). This matches the database schema where comments have a serial `id` primary key.

### 4. Delete confirmation: --force flag

**Decision:** Add a `--force` flag for `delete-comment`. In JSON mode, `--force` is implied (agents don't interact). In human mode, prompt for confirmation unless `--force` is provided.

**Alternative considered:** Always require `--force`. Rejected because human users benefit from a confirmation prompt, while agents always pass `--json` which implies non-interactive mode.

### 5. Formatter output: plain text for human mode

**Decision:** Display comments in human-readable format showing author, timestamp, and content. Strip HTML tags from content since the web UI stores rich text but the terminal should show plain text.

### 6. File organization

**Decision:** Create individual command files following existing pattern:
- `src/commands/comments.ts` — list comments
- `src/commands/comment.ts` — get single comment
- `src/commands/add-comment.ts` — create comment
- `src/commands/edit-comment.ts` — update comment
- `src/commands/delete-comment.ts` — delete comment

Each file exports a single async function that takes `CurlTicketClient` + args. This matches the existing one-file-per-command pattern (`projects.ts`, `issues.ts`, `issue.ts`, `update-status.ts`).

## Risks / Trade-offs

**[Risk] Content with special shell characters** → Agent-provided content may contain quotes or special characters. Mitigation: Commander.js handles positional arg parsing; the content arrives as a single string. Document in SKILL.md that content should be quoted.

**[Risk] Large comment lists** → No pagination on comments endpoint. Mitigation: Acceptable for now — issues rarely have hundreds of comments. Can add `--limit` later if needed.

**[Trade-off] HTML stripping in CLI** → Comments stored as HTML (from rich text editor) will lose formatting. Acceptable because terminal output is inherently plain text, and agents work with plain text content.

**[Trade-off] Positional content arg limits length** → Very long comments may hit shell argument limits. Mitigation: Most agent-generated comments are short status updates. Can add stdin support later if needed.
