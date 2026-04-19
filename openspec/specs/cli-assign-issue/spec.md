## ADDED Requirements

### Requirement: `assign` command changes an issue's assignee

The CLI SHALL provide `curl-ticket assign <projectId> <issueId> <assignee>` that sends `PATCH /api/projects/:projectId/issues/:issueId` with a body of `{ assigneeId: <resolved> }`. The resolved value MUST be either a UUID string or `null` (for unassignment).

`<issueId>` MUST accept both numeric database IDs and friendly IDs (e.g., `CT-42`), matching the existing `issue` and `update-status` commands' behavior via the shared `parseIssueId` helper.

#### Scenario: Assign to a user by UUID

- **WHEN** user runs `curl-ticket assign <projectId> 42 aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa --json`
- **THEN** the CLI sends `PATCH /api/projects/<projectId>/issues/42` with body `{ "assigneeId": "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" }`
- **AND** prints the updated issue JSON to stdout

#### Scenario: Assign to self via `me`

- **WHEN** user runs `curl-ticket assign <projectId> CT-42 me`
- **THEN** the CLI resolves `me` to the caller's `userId` before issuing the PATCH
- **AND** the PATCH body is `{ "assigneeId": "<caller-userId>" }`

#### Scenario: Assign by email

- **WHEN** user runs `curl-ticket assign <projectId> CT-42 alice@example.com`
- **THEN** the CLI calls `GET /api/projects/<projectId>/members` and looks up the member whose `email` matches case-insensitively
- **AND** the PATCH body is `{ "assigneeId": "<alice-userId>" }`

#### Scenario: Assign by email not in project

- **WHEN** the email does not match any member of the project
- **THEN** the CLI exits with `ExitCode.ValidationError` (4) and message `No project member with email "<value>".`
- **AND** no PATCH request is made

#### Scenario: Unassign with `none`

- **WHEN** user runs `curl-ticket assign <projectId> CT-42 none`
- **THEN** the PATCH body is `{ "assigneeId": null }`

#### Scenario: Unassign with `null`

- **WHEN** user runs `curl-ticket assign <projectId> CT-42 null`
- **THEN** the behavior is identical to the `none` case

#### Scenario: Invalid value format

- **WHEN** the value is neither `me`, `none`, `null`, a UUID, nor an email
- **THEN** the CLI exits with `ExitCode.ValidationError` (4) and a message listing accepted forms

#### Scenario: Server rejects assignee outside project

- **WHEN** the PATCH returns `400` because the resolved `assigneeId` is not a member/owner of the project
- **THEN** the CLI surfaces the server's error message and exits with the mapped error code

#### Scenario: Dry-run preview

- **WHEN** user runs `curl-ticket assign <projectId> CT-42 me --dry-run --json`
- **THEN** the CLI resolves the value but does NOT issue the PATCH
- **AND** prints `{ "dryRun": true, "issueId": ..., "friendlyId": "CT-42", "newAssigneeId": "<caller-userId>" }` to stdout

### Requirement: Assignee resolver helper

The CLI SHALL expose an internal resolver (shared by `assign` and `create-issue --assignee`) with the following contract, applied in order:

1. Empty string, `none`, or `null` → returns `null`.
2. `me` → returns the authenticated caller's profile id (fetched via `GET /api/auth/me` and cached for the duration of the CLI invocation).
3. UUID syntax match → returned verbatim as-is.
4. Value contains `@` → resolved against `GET /api/projects/:projectId/members`; returns the matching `userId` or throws `ValidationError`.
5. Any other input → throws `ValidationError` listing accepted forms.

#### Scenario: `me` cached across calls in a single invocation

- **WHEN** the CLI resolves `me` twice during a single process (e.g., batch script not applicable here, but future compatible)
- **THEN** `GET /api/auth/me` is called at most once

#### Scenario: Resolver requires projectId for email form

- **WHEN** the resolver is called with an email but no `projectId`
- **THEN** it throws `ValidationError` stating that email lookup requires a project context

### Requirement: CurlTicketClient `updateIssueAssignee()` method

The `CurlTicketClient` SHALL expose `updateIssueAssignee(projectId: string, issueId: string, assigneeId: string | null): Promise<IssueResponse>` that sends a `PATCH` with body `{ assigneeId }`.

#### Scenario: Method sends PATCH

- **WHEN** `client.updateIssueAssignee(p, i, "uuid-123")` is called
- **THEN** the client issues `PATCH /api/projects/<p>/issues/<i>` with body `{ "assigneeId": "uuid-123" }`

#### Scenario: Method accepts null

- **WHEN** `client.updateIssueAssignee(p, i, null)` is called
- **THEN** the PATCH body is `{ "assigneeId": null }` (not `{}`)
