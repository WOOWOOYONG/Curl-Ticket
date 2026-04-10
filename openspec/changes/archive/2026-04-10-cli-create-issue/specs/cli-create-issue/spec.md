## ADDED Requirements

### Requirement: Interactive issue type selection
The CLI SHALL prompt the user to select between `API Bug` and `Task` when `--type` is not provided and stdin is a TTY.

#### Scenario: No --type flag in interactive terminal
- **WHEN** user runs `ct create-issue <projectId>` without `--type` in an interactive terminal
- **THEN** the CLI presents a numbered menu: `1) API Bug  2) Task`
- **WHEN** user selects `1`
- **THEN** the CLI proceeds with the API Bug flow

#### Scenario: No --type flag in interactive terminal — select Task
- **WHEN** user runs `ct create-issue <projectId>` without `--type` in an interactive terminal
- **THEN** the CLI presents a numbered menu: `1) API Bug  2) Task`
- **WHEN** user selects `2`
- **THEN** the CLI proceeds with the Task flow

#### Scenario: No --type in non-TTY environment
- **WHEN** the command runs in a non-TTY environment without `--type`
- **THEN** the CLI SHALL exit with an error: `--type is required in non-interactive mode`

#### Scenario: Explicit --type flag skips prompt
- **WHEN** user runs `ct create-issue <projectId> --type task`
- **THEN** the CLI skips the type selection prompt and proceeds directly with the Task flow

### Requirement: Create API Bug issue from cURL command
The CLI SHALL support creating an API Bug issue by accepting a raw cURL command string, parsing it server-side, and submitting the parsed data to create the issue.

#### Scenario: Create API Bug with --curl flag
- **WHEN** user runs `ct create-issue <projectId> --type api_bug --curl "curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{"name":"test"}'"`
- **THEN** the CLI calls `POST /api/curl/parse` with the cURL string, receives parsed `{ url, method, headers, body }`, generates a title as `POST /users`, and calls `POST /api/projects/:projectId/issues` with `issueType: "api_bug"` and the parsed data
- **THEN** the CLI prints the created issue's friendly ID (e.g., `CT-42`) and title

#### Scenario: Create API Bug with --curl and explicit --title
- **WHEN** user runs `ct create-issue <projectId> --type api_bug --curl "..." --title "Login 500 error"`
- **THEN** the CLI uses the provided title instead of auto-generating one from the parsed URL

#### Scenario: Create API Bug with --curl and --env
- **WHEN** user runs `ct create-issue <projectId> --type api_bug --curl "..." --env Prod`
- **THEN** the created issue has `environment` set to `Prod`

#### Scenario: Create API Bug without --curl flag
- **WHEN** user runs `ct create-issue <projectId> --type api_bug` without `--curl`
- **THEN** the CLI SHALL exit with a validation error: `--curl is required for api_bug type`

### Requirement: Create Task issue with interactive guided flow
The CLI SHALL support creating a Task issue through an interactive guided flow when no `--title` flag is provided and stdin is a TTY.

#### Scenario: Interactive task — create now (minimal)
- **WHEN** user runs `ct create-issue <projectId> --type task` in an interactive terminal
- **THEN** the CLI prompts for `Title` (required)
- **THEN** the CLI presents a gate menu: `Create now` / `Add details` / `Cancel`
- **WHEN** user selects `Create now`
- **THEN** the CLI creates the issue with only the title and prints the created issue

#### Scenario: Interactive task — add details
- **WHEN** user selects `Add details` at the gate menu
- **THEN** the CLI prompts for `Why (motivation)` and `Goal (expected outcome)`
- **THEN** the CLI composes a Markdown description with `## Why` and `## Goal` sections
- **THEN** the CLI shows a preview of the issue (title + description) and asks for confirmation
- **WHEN** user confirms
- **THEN** the CLI creates the issue and prints the created issue

#### Scenario: Interactive task — cancel
- **WHEN** user selects `Cancel` at the gate menu
- **THEN** the CLI prints `Cancelled.` and exits without creating an issue

#### Scenario: Interactive task — empty title
- **WHEN** user enters an empty string for the title prompt
- **THEN** the CLI SHALL re-prompt for the title (title is required)

### Requirement: Non-interactive mode for scripting
The CLI SHALL support a non-interactive mode that bypasses all prompts when `--title` is provided, enabling use in scripts and CI pipelines.

#### Scenario: Non-interactive task creation
- **WHEN** user runs `ct create-issue <projectId> --type task --title "Refactor auth module" --description "Clean up the middleware"`
- **THEN** the CLI creates the issue directly without any prompts

#### Scenario: Non-interactive task with title only
- **WHEN** user runs `ct create-issue <projectId> --type task --title "Fix bug"`
- **THEN** the CLI creates the issue with null description, no prompts

#### Scenario: Non-TTY without --title for task type
- **WHEN** the command runs in a non-TTY environment (e.g., piped input) without `--title` for task type
- **THEN** the CLI SHALL exit with an error: `--title is required in non-interactive mode`

#### Scenario: Non-TTY without --type
- **WHEN** the command runs in a non-TTY environment without `--type`
- **THEN** the CLI SHALL exit with an error: `--type is required in non-interactive mode`

### Requirement: JSON output mode
The CLI SHALL support `--json` flag to output raw JSON responses, consistent with other commands.

#### Scenario: Create issue with --json
- **WHEN** user runs `ct create-issue <projectId> --type task --title "Test" --json`
- **THEN** the CLI outputs the full API response as formatted JSON to stdout

#### Scenario: Error with --json
- **WHEN** issue creation fails and `--json` flag is set
- **THEN** the CLI outputs the error as JSON to stderr (following existing `handleError` pattern)

### Requirement: Input validation
The CLI SHALL validate inputs before making API calls.

#### Scenario: Invalid projectId format
- **WHEN** user provides a projectId that is not a valid UUID
- **THEN** the CLI exits with a validation error: `Invalid projectId: "<value>" is not a valid UUID.`

#### Scenario: Invalid --type value
- **WHEN** user provides `--type invalid_type`
- **THEN** the CLI exits with a validation error listing valid types: `api_bug, task`

#### Scenario: Invalid --env value
- **WHEN** user provides `--env InvalidEnv` for an API Bug issue
- **THEN** the CLI exits with a validation error listing valid environments: `Local, Dev, Staging, Prod`

#### Scenario: Invalid --status value
- **WHEN** user provides `--status InvalidStatus`
- **THEN** the CLI exits with a validation error listing valid statuses

### Requirement: CurlTicketClient API methods
The `CurlTicketClient` class SHALL expose `parseCurl()` and `createIssue()` methods for the create-issue command.

#### Scenario: parseCurl sends cURL to server
- **WHEN** `client.parseCurl(curlString)` is called
- **THEN** it sends `POST /api/curl/parse` with body `{ curl: curlString }` and returns `{ data: { url, method, headers, body } }`

#### Scenario: createIssue sends issue data to server
- **WHEN** `client.createIssue(projectId, issueData)` is called
- **THEN** it sends `POST /api/projects/:projectId/issues` with the issue data as body and returns the created issue response
