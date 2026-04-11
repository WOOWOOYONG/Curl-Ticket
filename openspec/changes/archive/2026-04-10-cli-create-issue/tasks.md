## 1. Types & API Client

- [x] 1.1 Add `ParseCurlResponse` and `CreateIssueInput` types to `packages/cli/src/types.ts` — `ParseCurlResponse: { data: { url: string, method: string, headers: Record<string, string> | null, body: unknown | null } }`, `CreateIssueInput: { issueType, title, description?, rawCurl?, method?, url?, environment?, requestHeaders?, requestBody?, status? }`
- [x] 1.2 Add `parseCurl(curl: string)` method to `CurlTicketClient` in `packages/cli/src/api-client.ts` — sends `POST /api/curl/parse` with `{ curl }` body, returns `ParseCurlResponse`
- [x] 1.3 Add `createIssue(projectId: string, data: CreateIssueInput)` method to `CurlTicketClient` — sends `POST /api/projects/:projectId/issues` with data as body, returns `IssueResponse`

## 2. Interactive Prompt Helpers

- [x] 2.1 Add `promptInput(question: string): Promise<string>` to `packages/cli/src/utils.ts` — uses readline to ask for a single-line text input, returns trimmed answer
- [x] 2.2 Add `promptSelect(question: string, choices: string[]): Promise<string>` to `packages/cli/src/utils.ts` — displays numbered choices, validates selection, returns the selected choice string

## 3. Command Implementation

- [x] 3.1 Create `packages/cli/src/commands/create-issue.ts` with `createIssueCommand(client, projectId, options, json)` function — validate projectId (UUID); if `--type` not provided and stdin is TTY, prompt user to select between `API Bug` and `Task` via `promptSelect()`; if non-TTY and no `--type`, exit with error; validate type with `normalizeType()`, branch into API Bug or Task flow
- [x] 3.2 Implement API Bug flow — validate `--curl` is present, call `client.parseCurl()`, auto-generate title as `<METHOD> <url_path>` (override if `--title` provided), validate `--env` against environments list (default `Dev`), call `client.createIssue()` with assembled data
- [x] 3.3 Implement Task interactive flow — if no `--title` and stdin is TTY: prompt title (re-prompt if empty), show gate menu (Create now / Add details / Cancel), if Add details: prompt Why + Goal, compose Markdown description, preview, confirm, then call `client.createIssue()`
- [x] 3.4 Implement non-interactive mode — if `--type` and `--title` are both provided, skip all prompts and create directly; if stdin is not TTY and `--type` is missing, exit with error; if stdin is not TTY and `--title` is missing for task type, exit with error
- [x] 3.5 Implement output — human-readable mode: print `Issue created: <friendlyId> — <title>`; JSON mode: print full API response

## 4. Command Registration

- [x] 4.1 Register `create-issue` command in `packages/cli/src/index.ts` — add Commander definition with positional `<projectId>`, optional `--type <type>` (no longer required — prompted interactively when omitted), optional `--curl`, `--title`, `--description`, `--env`, `--status` options; wire up `withAuth` + `handleError` following existing patterns

## 5. Verification

- [x] 5.1 Run `pnpm lint` from project root — fix any linting issues
- [x] 5.2 Run `pnpm typecheck` from project root — fix any type errors
- [x] 5.3 Manual smoke test — build CLI (`cd packages/cli && pnpm build`), test `ct create-issue --help` outputs expected usage, verify command is listed in `ct --help`
