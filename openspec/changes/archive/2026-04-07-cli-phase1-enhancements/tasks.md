## 1. Pagination Hints

- [x] 1.1 Add `formatPagination(pagination: Pagination): string` helper to `formatters.ts` — returns `Showing {start}-{end} of {total} (page {page}/{totalPages})`, returns empty string when `totalPages <= 1`
- [x] 1.2 Update `issuesCommand` in `commands/issues.ts` to print pagination hint on stderr after data output (human mode only)
- [x] 1.3 Update `projectsCommand` in `commands/projects.ts` to print pagination hint on stderr after data output (human mode only)

## 2. Request Resilience (Timeout & Retry)

- [x] 2.1 Add `REQUEST_TIMEOUT` constant to `constants.ts` — read `CURL_TICKET_TIMEOUT` env var, default `30000`
- [x] 2.2 Add `AbortSignal.timeout(REQUEST_TIMEOUT)` to `request()` in `api-client.ts`, catch `AbortError` / `TimeoutError` and throw a descriptive error
- [x] 2.3 Implement retry logic in `request()` — retry once on `NetworkError` for GET requests only, retry once on 429 for all methods with `Retry-After` parsing (cap 60s, default 5s fallback)
- [x] 2.4 Add `RateLimitError` message handling to `resolveError()` in `index.ts` if needed

## 3. Project Management Commands

- [x] 3.1 Add `getProject(projectId)`, `createProject(data)`, `getMembers(projectId)` methods to `CurlTicketClient` in `api-client.ts`
- [x] 3.2 Add `ProjectDetailResponse`, `MembersResponse`, `Member`, `CreateProjectInput` types to `types.ts`
- [x] 3.3 Create `commands/project.ts` — `projectCommand(client, projectId, json)` with human-readable detail format
- [x] 3.4 Create `commands/create-project.ts` — `createProjectCommand(client, name, key, description, json)` with human-readable success message
- [x] 3.5 Create `commands/members.ts` — `membersCommand(client, projectId, json)` with tabular member list
- [x] 3.6 Register `project`, `create-project`, `members` commands in `index.ts` with options (`--name`, `--key`, `--description`)

## 4. Issue Delete Command

- [x] 4.1 Extract `confirm()` from `commands/delete-comment.ts` to `utils.ts` for reuse
- [x] 4.2 Add `deleteIssue(projectId, issueId)` method to `CurlTicketClient` in `api-client.ts`
- [x] 4.3 Create `commands/delete-issue.ts` — `deleteIssueCommand(client, projectId, issueId, json, force)` following `delete-comment.ts` pattern
- [x] 4.4 Register `delete-issue` command in `index.ts` with `--force` option
- [x] 4.5 Update `delete-comment.ts` to import `confirm()` from `utils.ts` instead of defining locally

## 5. Verification

- [x] 5.1 Run `pnpm lint` and fix any issues
- [x] 5.2 Run `pnpm typecheck` and fix any type errors
