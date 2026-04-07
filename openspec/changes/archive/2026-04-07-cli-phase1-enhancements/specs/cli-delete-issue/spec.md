## ADDED Requirements

### Requirement: Delete issue with confirmation

The CLI SHALL provide a `ct delete-issue <projectId> <issueId>` command that deletes an issue. Without the `--force` flag, the CLI SHALL prompt for interactive confirmation before proceeding. In JSON mode, confirmation is skipped (equivalent to `--force`).

#### Scenario: Delete with interactive confirmation (accepted)

- **WHEN** user runs `ct delete-issue <projectId> <issueId>` and responds `y` to the confirmation prompt
- **THEN** the CLI sends `DELETE /api/projects/:projectId/issues/:issueId` and prints `Issue <issueId> deleted.`

#### Scenario: Delete with interactive confirmation (rejected)

- **WHEN** user runs `ct delete-issue <projectId> <issueId>` and responds `n` to the confirmation prompt
- **THEN** the CLI prints `Cancelled.` and does not send the delete request

#### Scenario: Delete with --force flag

- **WHEN** user runs `ct delete-issue <projectId> <issueId> --force`
- **THEN** the CLI skips the confirmation prompt and deletes the issue immediately

#### Scenario: Delete in JSON mode

- **WHEN** user runs `ct delete-issue <projectId> <issueId> --json`
- **THEN** the CLI skips the confirmation prompt and outputs the raw JSON response `{ "success": true }`

#### Scenario: Unauthorized deletion

- **WHEN** user runs `ct delete-issue <projectId> <issueId>` but is neither the issue creator nor the project owner
- **THEN** the CLI reports `Access denied for this project.` and exits with `ExitCode.AuthError`

#### Scenario: Issue not found

- **WHEN** user runs `ct delete-issue <projectId> <issueId>` with a non-existent issue ID
- **THEN** the CLI reports `Resource not found.` and exits with `ExitCode.NotFound`
