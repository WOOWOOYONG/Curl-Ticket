## Context

The CLI (`packages/cli`) uses Commander.js with a consistent pattern: each command is an async function `(client, ...args, json) => void`, output goes to stdout (JSON or human-readable), errors to stderr. Authentication is handled by `withAuth()` which wraps all data commands. The `CurlTicketClient` class in `api-client.ts` centralizes all HTTP calls via a single `request()` method.

All four Phase 1 features are purely CLI-side changes — no server API modifications are needed. The existing server endpoints (`GET /projects/:id`, `POST /projects`, `GET /projects/:id/members`, `DELETE /projects/:id/issues/:issueId`) already return the data we need.

## Goals / Non-Goals

**Goals:**
- Add pagination hints to human-readable list output without changing JSON mode
- Make the CLI resilient to transient network failures and rate limits
- Expose project detail, creation, and member listing via CLI
- Enable issue deletion from the CLI with a safety confirmation prompt

**Non-Goals:**
- Changing JSON output structure (backwards compatible)
- Adding server-side routes or modifying existing API responses
- Interactive issue creation (Phase 3)
- Soft-delete migration (separate change)

## Decisions

### 1. Pagination hint placement — after the list, not before

Display `Showing 1-10 of 42 (page 1/5)` on stderr after the list items. Using stderr keeps stdout pipe-friendly (e.g., `ct issues <id> | grep Open` still works).

**Alternative considered:** Print before the list. Rejected because the data is the primary output and should come first, and users piping output would get metadata mixed in.

### 2. Timeout via `AbortSignal.timeout()` in `request()`

Use native `AbortSignal.timeout(ms)` (Node 18+) inside `CurlTicketClient.request()`. Read `CURL_TICKET_TIMEOUT` env var in `constants.ts`, default 30000ms.

**Alternative considered:** Custom `setTimeout` + `AbortController`. Rejected — `AbortSignal.timeout()` is cleaner and the CLI already targets Node 18+.

### 3. Retry strategy — NetworkError and 429 only, max 1 retry

Only retry on:
- `NetworkError` (fetch threw, no response) — retry once immediately
- HTTP 429 — respect `Retry-After` header, cap at 60s, retry once

Do NOT retry on other HTTP errors (4xx/5xx are deterministic). Do NOT retry mutating requests (`POST`, `PATCH`, `DELETE`) on network errors to avoid duplicate side effects. 429 retries apply to all methods since rate limiting is transient.

**Alternative considered:** Retry all methods. Rejected — retrying `DELETE` or `POST` on network errors risks duplicate operations (the request may have reached the server).

### 4. New commands follow existing patterns exactly

- `commands/project.ts` — `projectCommand(client, projectId, json)`
- `commands/create-project.ts` — `createProjectCommand(client, name, key, description, json)`
- `commands/members.ts` — `membersCommand(client, projectId, json)`
- `commands/delete-issue.ts` — `deleteIssueCommand(client, projectId, issueId, json, force)`

Each follows the same signature pattern as existing commands. The `confirm()` helper in `delete-comment.ts` will be extracted to `utils.ts` so `delete-issue.ts` can reuse it.

### 5. `api-client.ts` new methods

Add to `CurlTicketClient`:
- `getProject(projectId)` → `GET /api/projects/:projectId`
- `createProject(data)` → `POST /api/projects`
- `getMembers(projectId)` → `GET /api/projects/:projectId/members`
- `deleteIssue(projectId, issueId)` → `DELETE /api/projects/:projectId/issues/:issueId`

All follow the existing `request<T>()` pattern.

### 6. Type additions in `types.ts`

- `ProjectDetailResponse` — `{ data: Project & { totalIssues, openIssues } }`
- `MembersResponse` — `{ data: Member[] }` where `Member = { userId, name, email, createdAt }`
- `CreateProjectInput` — `{ name, key, description? }`

## Risks / Trade-offs

- **[Retry on 429 for mutating requests]** → Acceptable because 429 means the server rejected the request before processing it. The request was not executed.
- **[AbortSignal.timeout requires Node 18+]** → CLI already requires Node 18+ (ESM, top-level await). No risk.
- **[confirm() uses readline on stderr]** → Consistent with existing `delete-comment.ts` and `promptUrl()` patterns. Works correctly in piped scenarios.
- **[Hard delete via CLI]** → The server currently hard-deletes issues. The `--force` skip and interactive confirmation mitigate accidental deletion. When server migrates to soft-delete, CLI behavior becomes even safer without code changes.

## Open Questions

_(none — all server APIs verified, patterns established)_
