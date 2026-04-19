## 1. Types and shared helpers

- [x] 1.1 Extend `IssueSummary` and `IssueDetail` in `packages/cli/src/types.ts` with `assigneeId: string | null` and `assignee: { id, name, email } | null`.
- [x] 1.2 Add `MyIssuesOptions`, `MyIssuesItem`, and `MyIssuesResponse` interfaces in `packages/cli/src/types.ts` (include `summary` shape).
- [x] 1.3 Add `AuthMeResponse` interface matching `GET /api/auth/me` output (`id`, `email`, `name`).
- [x] 1.4 In `packages/cli/src/constants.ts`, extend `ISSUE_FIELDS` with `assigneeId` and `assignee`.
- [x] 1.5 Add a UUID regex and an email regex (or reuse existing) alongside `validateProjectId` in `packages/cli/src/utils.ts`.

## 2. Assignee resolver

- [x] 2.1 Implement `resolveAssignee({ value, projectId, client })` in `packages/cli/src/utils.ts` following the order: empty/`none`/`null` → null; `me` → `/api/auth/me` (cached); UUID → passthrough; email → project members lookup; else → `ValidationError`.
- [x] 2.2 Add an in-memory cache for the `me` lookup keyed by the client instance (or module-level map).
- [x] 2.3 Export a `ValidationError` message listing accepted forms (`me`, `none`, `<uuid>`, `<email>`).
- [x] 2.4 Unit test the resolver in `packages/cli/src/__tests__/` covering all six branches (null, me, uuid, email match, email miss, invalid).

## 3. API client additions

- [x] 3.1 Add `getAuthMe(): Promise<AuthMeResponse>` to `CurlTicketClient`.
- [x] 3.2 Add `getMyIssues(options?: MyIssuesOptions): Promise<MyIssuesResponse>` that builds the query string by skipping undefined/empty fields and supports repeatable `status`.
- [x] 3.3 Add `updateIssueAssignee(projectId, issueId, assigneeId: string | null)` that PATCHes `{ assigneeId }`.
- [x] 3.4 Extend `getIssues()` to accept and forward `assigneeId` (string or literal `'null'`).
- [x] 3.5 Extend `createIssue()` payload typing so `assigneeId` is an optional field that passes through to the POST body.

## 4. `issues` list command — assignee support

- [x] 4.1 In `src/index.ts`, add `--assignee <value>` option to the `issues <projectId>` command registration.
- [x] 4.2 In `src/commands/issues.ts`, resolve `options.assignee` through `resolveAssignee` before calling `client.getIssues`.
- [x] 4.3 Update `formatIssueSummary` in `src/formatters.ts` to render the assignee column using the name/email/`Unassigned` rule.

## 5. `issue` detail command — assignee display

- [x] 5.1 Update `formatIssueDetail` in `src/formatters.ts` to include an `Assignee: ...` line.
- [x] 5.2 Verify `--fields assignee,assigneeId` works end to end (no code change beyond 1.4, but exercise in tests).

## 6. `create-issue` — `--assignee` flag

- [x] 6.1 In `src/index.ts`, add `--assignee <value>` option to the `create-issue` command registration.
- [x] 6.2 In `src/commands/create-issue.ts`, resolve `options.assignee` via `resolveAssignee` and include `assigneeId` in the `CreateIssuePayload` only when the flag is provided (include `null` when resolved to null).
- [x] 6.3 Confirm both `apiBugFlow` and `taskFlow` propagate the resolved value.

## 7. New `assign` command

- [x] 7.1 Create `packages/cli/src/commands/assign.ts` exporting `assignCommand(client, projectId, issueId, value, { json, dryRun })`.
- [x] 7.2 Implement the dry-run branch to print `{ dryRun: true, issueId, friendlyId, newAssigneeId }` without calling the PATCH.
- [x] 7.3 Register the command in `src/index.ts` with signature `assign <projectId> <issueId> <assignee>` and `--dry-run` option.
- [x] 7.4 Reuse `parseIssueId` from `src/utils.ts` for friendly-ID support and `client.getIssueByNumber` when needed.

## 8. New `my-issues` command

- [x] 8.1 Create `packages/cli/src/commands/my-issues.ts` exporting `myIssuesCommand(client, options, json)`.
- [x] 8.2 Implement flag normalization: `--status` repeatable → pass through `normalizeStatus`; `--project` → `validateProjectId`; `--environment` → `normalizeEnvironment`; numeric parsing for `--page` / `--page-size`.
- [x] 8.3 Implement the human-readable output: summary header line + issue rows (project key, `#<num>`, title, status, environment, relative updated time).
- [x] 8.4 Implement the two empty-state messages (`summary.total === 0` vs filters excluded everything).
- [x] 8.5 Register the command in `src/index.ts` with all flags wired up.

## 9. Schema introspection

- [x] 9.1 Update `packages/cli/src/commands/schema.ts` to include the new `my-issues` and `assign` commands with their flags and enum values.
- [x] 9.2 Add `--assignee` to the documented options for `issues` and `create-issue` in the schema output.
- [x] 9.3 Confirm `assigneeId` and `assignee` appear in the schema's issue field list.

## 10. Skill documentation

- [x] 10.1 Update `packages/cli/skills/curl-ticket/SKILL.md` "CLI Commands" block with `my-issues`, `assign`, and `--assignee` flags on existing commands.
- [x] 10.2 Add an "Assignee resolution" section with two parts:
  - (a) **CLI-accepted formats**: `me` / `none` / `null` / email / UUID — these are the only values the CLI resolver understands.
  - (b) **Agent workflow for natural-language names** (e.g. "Alice", "指派給小明"): the Agent MUST first run `curl-ticket members <projectId> --json`, match the name case-insensitively against member `name` (falling back to email local-part). On a single match, pass the resolved email or `userId` to `--assignee`. On multiple matches, list the candidates and ask the user to confirm. On zero matches, report that no such member exists in the project.
- [x] 10.3 Update the "Single-resource JSON Output Format" sample to include `assigneeId` and `assignee` fields.
- [x] 10.4 Add a "My assignments" workflow hint starting with `curl-ticket my-issues --json -s Open`.

## 11. Tests

- [x] 11.1 Add unit tests for `resolveAssignee` (all six branches) in `packages/cli/src/__tests__/`.
- [x] 11.2 Add command-level tests for `my-issues` covering: no flags, repeatable `--status`, invalid `--project`, JSON mode, empty states.
- [x] 11.3 Add command-level tests for `assign` covering: UUID, `me`, email hit, email miss, `none`, `--dry-run`.
- [x] 11.4 Add test for `issues --assignee me` forwarding `assigneeId` query param.
- [x] 11.5 Add test for `create-issue --assignee none` including `assigneeId: null` in POST body.

## 12. Verification and release

- [x] 12.1 Run `pnpm --filter curl-ticket lint` (or repo root `pnpm lint`) — zero errors.
- [x] 12.2 Run `pnpm --filter curl-ticket typecheck` (or `pnpm typecheck`) — zero errors.
- [x] 12.3 Run `pnpm --filter curl-ticket test` — all tests pass.
- [ ] 12.4 Manually smoke test against a real server: `my-issues --json`, `assign ... me`, `assign ... none`, `create-issue ... --assignee <email>`.
- [x] 12.5 Bump `packages/cli/package.json` version (minor — new commands) per the CLI release flow in `CLAUDE.md`.
- [ ] 12.6 Prepare a `cli@x.y.z` tag once merged to `main`; CI auto-publishes.
