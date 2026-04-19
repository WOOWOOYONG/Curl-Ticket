## ADDED Requirements

### Requirement: `my-issues` command surfaces caller's assignments

The CLI SHALL provide a top-level `my-issues` command that calls `GET /api/me/issues` and renders every issue assigned to the authenticated user across all projects they still have access to. The command MUST require no positional arguments and MUST NOT accept a caller-supplied `assigneeId` (the server derives identity from the session).

#### Scenario: Run without flags

- **WHEN** user runs `curl-ticket my-issues`
- **THEN** the CLI calls `GET /api/me/issues` with no query parameters
- **AND** prints a one-line summary header (`Open N · In Progress N · Done N · Close N · Total N`) derived from `response.summary`
- **AND** prints one row per issue in `response.data` showing project key, `#<issueNumber>`, title, status, environment, relative updated timestamp, and assignee column omitted (all rows are self-assigned)

#### Scenario: JSON mode

- **WHEN** user runs `curl-ticket my-issues --json`
- **THEN** the CLI writes the raw JSON response including `data`, `pagination`, and `summary` to stdout with no transformation

#### Scenario: Empty result in human mode

- **WHEN** the response has `data: []` and `summary.total === 0`
- **THEN** the CLI prints `No issues assigned to you.` and exits `0`

#### Scenario: Empty result after filters

- **WHEN** the response has `data: []` but `summary.total > 0`
- **THEN** the CLI prints `No issues match these filters.` (and still shows the summary header) and exits `0`

### Requirement: `my-issues` forwards filters to the endpoint

The command SHALL accept flags that map directly onto the `GET /api/me/issues` query parameters documented in capability `my-issues`. Flags are optional; omitted flags MUST NOT be sent so that server defaults apply.

Supported flags:

- `-s, --status <status>` — repeatable; each value is normalized via the existing `normalizeStatus` helper before being sent.
- `--project <projectId>` — UUID; validated via `validateProjectId`.
- `--environment <env>` — normalized via `normalizeEnvironment`.
- `--search <query>` — passed verbatim as `search`.
- `--sort <field>` — one of `updatedAt`, `createdAt`, `status`.
- `--order <direction>` — `asc` or `desc`.
- `--page <n>` — positive integer, default unset.
- `--page-size <n>` — positive integer, max 50, default unset.

#### Scenario: Repeatable status filter

- **WHEN** user runs `curl-ticket my-issues -s Open -s "In Progress"`
- **THEN** the CLI sends a request with query string containing `status=Open&status=In%20Progress` (order irrelevant)

#### Scenario: Invalid status value

- **WHEN** user runs `curl-ticket my-issues -s Bogus`
- **THEN** `normalizeStatus` throws a `ValidationError`
- **AND** the CLI exits with `ExitCode.ValidationError` (4) before any HTTP call is made

#### Scenario: Invalid project UUID

- **WHEN** user runs `curl-ticket my-issues --project not-a-uuid`
- **THEN** `validateProjectId` throws a `ValidationError`
- **AND** the CLI exits with `ExitCode.ValidationError` (4)

#### Scenario: Server rejects pageSize

- **WHEN** the server returns `400` because `pageSize` exceeds the allowed maximum
- **THEN** the CLI surfaces the error message and exits with `ExitCode.GeneralError` (or the existing API error mapping)

### Requirement: CurlTicketClient `getMyIssues()` method

The `CurlTicketClient` class SHALL expose a `getMyIssues(options?: MyIssuesOptions): Promise<MyIssuesResponse>` method that builds a query string from the provided options and calls `GET /api/me/issues`.

The response type MUST expose `data`, `pagination`, and `summary` fields matching the server contract. The `data` items MUST include `project: { id, key, name }` so the CLI can render project context without additional lookups.

#### Scenario: Method builds query string from options

- **WHEN** `client.getMyIssues({ status: ['Open'], sort: 'updatedAt', order: 'desc' })` is called
- **THEN** the client issues `GET /api/me/issues?status=Open&sort=updatedAt&order=desc`

#### Scenario: Method omits unset options

- **WHEN** `client.getMyIssues()` is called with no options
- **THEN** the client issues `GET /api/me/issues` with no query string

#### Scenario: Response surfaces summary

- **WHEN** the server returns a valid response with a `summary` object
- **THEN** the resolved value contains `summary: { open, inProgress, done, close, total }` unchanged from the server
