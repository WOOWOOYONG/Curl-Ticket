## ADDED Requirements

### Requirement: `create-issue` accepts `--assignee` flag

The `create-issue` command SHALL accept an optional `--assignee <value>` flag where `<value>` is processed by the shared assignee resolver described in capability `cli-assign-issue`. The resolved `assigneeId` (either a UUID or `null`) MUST be included in the `POST /api/projects/:projectId/issues` request body under the `assigneeId` key. When the flag is omitted, the field MUST NOT be sent so the server default (null) applies.

The flag MUST work for both `api_bug` and `task` flows and in both interactive and non-interactive modes.

#### Scenario: Create task assigned to self

- **WHEN** user runs `curl-ticket create-issue <projectId> --type task --title "Investigate flake" --assignee me --json`
- **THEN** the CLI resolves `me` to the caller's `userId`
- **AND** sends `POST /api/projects/<projectId>/issues` with body containing `"assigneeId": "<caller-userId>"`

#### Scenario: Create API Bug assigned by email

- **WHEN** user runs `curl-ticket create-issue <projectId> --type api_bug --curl "..." --assignee alice@example.com`
- **THEN** the CLI resolves the email against project members and includes the matching `assigneeId` in the POST body

#### Scenario: Create issue with explicit UUID

- **WHEN** user runs `curl-ticket create-issue <projectId> --type task --title "X" --assignee aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa`
- **THEN** the POST body contains `"assigneeId": "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"` without calling the members endpoint

#### Scenario: Create unassigned issue

- **WHEN** user runs `curl-ticket create-issue <projectId> --type task --title "X" --assignee none`
- **THEN** the POST body contains `"assigneeId": null`

#### Scenario: Flag omitted

- **WHEN** user runs `curl-ticket create-issue <projectId> --type task --title "X"` (no `--assignee`)
- **THEN** the POST body MUST NOT contain an `assigneeId` key

#### Scenario: Server rejects non-member assignee

- **WHEN** the resolved `assigneeId` is not a member or owner of the project and the server returns 400
- **THEN** the CLI surfaces the server's error message and exits with the mapped error code

#### Scenario: Invalid flag value

- **WHEN** user passes `--assignee not-an-email-or-uuid`
- **THEN** the CLI exits with `ExitCode.ValidationError` (4) before making any HTTP calls
