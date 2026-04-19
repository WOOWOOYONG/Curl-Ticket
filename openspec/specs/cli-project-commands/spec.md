## ADDED Requirements

### Requirement: `issues` list supports `--assignee` filter

The `issues <projectId>` command SHALL accept an optional `--assignee <value>` flag where `<value>` is processed by the shared assignee resolver (see capability `cli-assign-issue`). The resolved identifier MUST be forwarded as the `assigneeId` query parameter on `GET /api/projects/:projectId/issues`. When the flag is omitted, no `assigneeId` query parameter MUST be sent.

`me`, `none`/`null`, email, and UUID inputs MUST all be supported. When the resolver returns `null` (i.e., user passed `none`), the CLI MUST send `assigneeId=null` (literal) so the server can filter to unassigned issues.

#### Scenario: Filter by self

- **WHEN** user runs `curl-ticket issues <projectId> --assignee me --json`
- **THEN** the CLI calls `GET /api/projects/<projectId>/issues?assigneeId=<caller-userId>&pageSize=<default>`

#### Scenario: Filter unassigned

- **WHEN** user runs `curl-ticket issues <projectId> --assignee none`
- **THEN** the CLI calls the endpoint with `assigneeId=null`

#### Scenario: Filter by email

- **WHEN** user runs `curl-ticket issues <projectId> --assignee alice@example.com`
- **THEN** the CLI resolves the email via `GET /api/projects/:projectId/members` and forwards the matching userId as `assigneeId`

#### Scenario: Flag omitted

- **WHEN** user runs `curl-ticket issues <projectId> -s Open`
- **THEN** the URL MUST NOT contain an `assigneeId` query parameter

### Requirement: List and detail output surfaces assignee

`formatIssueSummary` and `formatIssueDetail` SHALL render the current assignee for each issue.

The rule is:

- If `issue.assignee?.name` is present and non-empty → display that name.
- Else if `issue.assignee?.email` is present → display the email.
- Else → display the literal string `Unassigned`.

The assignee MUST appear on list rows as a dedicated column/field and MUST appear on the detail view alongside status/environment/created metadata.

#### Scenario: List row for assigned issue

- **WHEN** an issue has `assignee: { id, name: "Alice", email: "alice@example.com" }`
- **THEN** the list row includes an `Alice` assignee field

#### Scenario: List row falls back to email when name is null

- **WHEN** `assignee.name` is `null` and `assignee.email` is `bob@example.com`
- **THEN** the list row displays `bob@example.com` as the assignee

#### Scenario: List row for unassigned issue

- **WHEN** `assignee` is `null`
- **THEN** the list row displays `Unassigned`

#### Scenario: Detail view for unassigned issue

- **WHEN** the user runs `curl-ticket issue <projectId> CT-42` and the issue is unassigned
- **THEN** the rendered detail view includes a line reading `Assignee: Unassigned`

### Requirement: Issue response types include assignee

The `IssueSummary` and `IssueDetail` types exported from `packages/cli/src/types.ts` SHALL include:

- `assigneeId: string | null`
- `assignee: { id: string; name: string | null; email: string } | null`

The `ISSUE_FIELDS` constant (used by `issue --fields`) SHALL include `assigneeId` and `assignee` so agents can request only those fields.

#### Scenario: `--fields` accepts assignee

- **WHEN** user runs `curl-ticket issue <projectId> CT-42 --json --fields status,assignee`
- **THEN** the CLI does NOT reject the field list as invalid
- **AND** the output contains only `id`, `status`, and `assignee` from the response data

#### Scenario: Schema command lists assignee fields

- **WHEN** user runs `curl-ticket schema`
- **THEN** the emitted schema JSON lists `assigneeId` and `assignee` among the available issue fields
- **AND** lists `--assignee` as a flag on both `issues` and `create-issue`
- **AND** lists the `assign` and `my-issues` commands

### Requirement: Create project

The CLI SHALL provide a `ct create-project --name <name> --key <key> [--description <desc>]` command that creates a new project. The `--name` and `--key` options are required. The creator is automatically added as project owner and member.

#### Scenario: Create project with required fields

- **WHEN** user runs `ct create-project --name "My Project" --key "MP"`
- **THEN** the CLI sends `POST /api/projects` and displays the created project details

#### Scenario: Create project with description

- **WHEN** user runs `ct create-project --name "My Project" --key "MP" --description "A test project"`
- **THEN** the CLI creates the project with the description and displays the result

#### Scenario: Create project in JSON mode

- **WHEN** user runs `ct create-project --name "My Project" --key "MP" --json`
- **THEN** the CLI outputs the raw JSON response from the API

#### Scenario: Validation error on missing required fields

- **WHEN** user runs `ct create-project` without `--name` or `--key`
- **THEN** Commander.js reports the missing required option and exits

### Requirement: List project members

The CLI SHALL provide a `ct members <projectId>` command that lists all members of a project, displaying each member's name (or email as fallback) and join date.

#### Scenario: List members in human-readable mode

- **WHEN** user runs `ct members <projectId>`
- **THEN** the CLI displays each member's name (or email if name is null), and join date

#### Scenario: List members in JSON mode

- **WHEN** user runs `ct members <projectId> --json`
- **THEN** the CLI outputs the raw JSON response from `GET /api/projects/:projectId/members`

#### Scenario: No members found

- **WHEN** user runs `ct members <projectId>` and the project has no members
- **THEN** the CLI prints `No members found.`
