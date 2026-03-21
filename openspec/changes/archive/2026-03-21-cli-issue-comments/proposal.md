## Why

The CLI currently only supports changing issue status (`update-status`), limiting what AI Agents can do through the CLI. Engineering teams using AI Agents need the ability to read and write issue comments programmatically — for example, to post investigation results, add context from logs, or discuss issues without leaving the terminal. Adding comment CRUD commands and updating the corresponding docs and skill files makes the CLI a complete interface for agent-driven comment workflows.

## Non-goals

- Rich text / HTML rendering in CLI output — comments will be displayed as plain text
- Comment reactions, mentions, or threading
- Real-time comment subscriptions / streaming
- Modifying the existing server-side comment API routes (they already support full CRUD)

## What Changes

- **New CLI commands** for issue comment operations:
  - `comments <projectId> <issueId>` — list comments on an issue
  - `comment <projectId> <issueId> <commentId>` — get a single comment
  - `add-comment <projectId> <issueId> <content>` — create a comment
  - `edit-comment <projectId> <issueId> <commentId> <content>` — update a comment
  - `delete-comment <projectId> <issueId> <commentId>` — delete a comment
- **API client methods** added to `CurlTicketClient` for all four comment endpoints
- **Types** added for comment API responses (`CommentResponse`, `CommentsResponse`)
- **Schema command updated** (`schema.ts`) to expose comment commands for agent introspection
- **README.md updated** to document new comment commands (English + 繁體中文 sections)
- **SKILL.md updated** to include comment commands in the AI agent skill, with usage examples and workflow guidance

## Capabilities

### New Capabilities
- `cli-comment-commands`: CLI commands for issue comment CRUD (list, get, create, update, delete) with `--json` support, plus corresponding documentation and skill file updates

### Modified Capabilities
_(none — the server-side comment API already exists and requires no changes)_

## Impact

- **Code**: `packages/cli/` — new command files, API client methods, types, schema updates, formatters
- **Docs**: `packages/cli/README.md` — add comment command reference
- **Skills**: `packages/cli/skills/curl-ticket/SKILL.md` — add comment commands and agent workflow
- **APIs**: No server-side changes; all comment endpoints already exist
- **Dependencies**: No new dependencies required
- **PRD modules**: `docs/prd/issues.md` may need a CLI section update for comment commands
