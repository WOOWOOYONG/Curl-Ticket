## ADDED Requirements

### Requirement: `--interactive` flag scope

The `curl-ticket create-issue` command SHALL accept an `--interactive` (alias `-i`) flag that, when present with `--type task`, drives a terminal-based question flow using `@inquirer/prompts`.

#### Scenario: Flag enabled for task type
- **WHEN** the user runs `curl-ticket create-issue <projectId> --type task --interactive`
- **THEN** the CLI starts an interactive question flow without needing additional flags

#### Scenario: Flag rejected for non-task types
- **WHEN** the user runs `curl-ticket create-issue <projectId> --type api_bug --interactive`
- **THEN** the CLI exits with code 4 and a message indicating `--interactive` is only supported with `--type task` in v1

#### Scenario: Flag conflicts with `--json`
- **WHEN** the user passes both `--interactive` and `--json`
- **THEN** the CLI exits with code 4 and a message that the two flags are mutually exclusive

### Requirement: Question parity with the skill

The interactive flow SHALL ask the same questions in the same order as the `curl-ticket-create-task` skill: project (skipped if `<projectId>` was already passed), title, why, acceptance criteria, assignee.

#### Scenario: ProjectId argument skips project question
- **WHEN** a project ID is supplied as a positional argument
- **THEN** the interactive flow does not ask for a project and uses that ID

#### Scenario: ProjectId omitted triggers picker
- **WHEN** the user runs `curl-ticket create-issue --type task --interactive` without a project ID
- **THEN** the CLI fetches projects via the existing API client and presents a picker; if zero projects are returned the CLI exits with code 4

#### Scenario: Acceptance criteria collected as multi-line input
- **WHEN** the user is prompted for acceptance criteria
- **THEN** the prompt accepts multiple lines (one criterion per line) and the CLI normalises each non-empty line into a `- <line>` bullet

### Requirement: Pre-fill from non-interactive flags

When `--interactive` is combined with `--title`, `--description`, or `--assignee`, the CLI SHALL use those values as default answers but still ask each question.

#### Scenario: Title pre-filled
- **WHEN** the user runs `curl-ticket create-issue <projectId> --type task --interactive --title "Fix login"`
- **THEN** the title prompt is shown with `Fix login` as the default value, which the user can accept by pressing Enter

#### Scenario: Description pre-filled and split into sections
- **WHEN** the user passes `--description` containing `## Why` and `## Acceptance Criteria` sections
- **THEN** the CLI parses the Markdown and pre-fills the why and acceptance criteria prompts with the corresponding section bodies

### Requirement: Preview and confirmation

The interactive flow SHALL display the assembled title and description before issuing any mutation, and MUST NOT call the create-issue API until the user confirms.

#### Scenario: Confirm sends the request
- **WHEN** the user selects `Confirm` at the preview prompt
- **THEN** the CLI calls the existing create-issue API client with the assembled payload

#### Scenario: Edit returns to a single field
- **WHEN** the user selects `Edit`
- **THEN** the CLI shows a follow-up picker (`Title` / `Why` / `Acceptance Criteria` / `Assignee`) and re-runs only the chosen prompt before showing the preview again

#### Scenario: Cancel exits without mutation
- **WHEN** the user selects `Cancel`
- **THEN** the CLI exits with code 0 without calling any mutating endpoint and prints a short confirmation message

### Requirement: Result reporting

On success, the interactive flow SHALL print the resulting `friendlyId` and issue URL in human-readable form (not JSON, since `--json` is incompatible).

#### Scenario: Success output
- **WHEN** the API returns 201 with the created issue
- **THEN** the CLI prints a line containing the friendly ID (e.g. `CT-42`) and the issue URL

#### Scenario: API error surfaces verbatim
- **WHEN** the API returns a 4xx error
- **THEN** the CLI prints the error message and exits with the corresponding mapped exit code (2 for 401/403, 3 for 404, 4 for 422)
