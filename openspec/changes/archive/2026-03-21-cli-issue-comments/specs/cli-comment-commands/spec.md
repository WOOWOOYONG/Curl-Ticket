## ADDED Requirements

### Requirement: List comments for an issue
The CLI SHALL provide a `comments <projectId> <issueId>` command that lists all comments on an issue. The command SHALL support `--json` output mode. Human-readable output SHALL display each comment's author, timestamp, and content (HTML stripped to plain text).

#### Scenario: List comments in human mode
- **WHEN** user runs `ct comments <projectId> <issueId>`
- **THEN** the CLI displays all comments with author name, relative timestamp, and plain text content

#### Scenario: List comments in JSON mode
- **WHEN** user runs `ct comments <projectId> <issueId> --json`
- **THEN** the CLI outputs `{ "data": [...] }` with full comment objects

#### Scenario: Issue has no comments
- **WHEN** user runs `ct comments <projectId> <issueId>` and the issue has no comments
- **THEN** the CLI displays a "No comments" message (human mode) or `{ "data": [] }` (JSON mode)

#### Scenario: Issue or project not found
- **WHEN** user runs `ct comments <projectId> <issueId>` with an invalid project or issue ID
- **THEN** the CLI exits with code 3 (NotFound) and displays an error message

### Requirement: Get a single comment
The CLI SHALL provide a `comment <projectId> <issueId> <commentId>` command that retrieves a single comment by its numeric ID.

#### Scenario: Get comment in human mode
- **WHEN** user runs `ct comment <projectId> <issueId> <commentId>`
- **THEN** the CLI displays the comment's author, timestamp, and plain text content

#### Scenario: Get comment in JSON mode
- **WHEN** user runs `ct comment <projectId> <issueId> <commentId> --json`
- **THEN** the CLI outputs the full comment object as JSON

#### Scenario: Comment not found
- **WHEN** user runs `ct comment <projectId> <issueId> <commentId>` with a non-existent comment ID
- **THEN** the CLI exits with code 3 (NotFound) and displays an error message

### Requirement: Create a comment
The CLI SHALL provide an `add-comment <projectId> <issueId> <content>` command that creates a new comment on an issue. The content MUST be between 1 and 5000 characters.

#### Scenario: Create comment successfully
- **WHEN** user runs `ct add-comment <projectId> <issueId> "investigation complete, root cause is..."`
- **THEN** the CLI creates the comment and displays the created comment details

#### Scenario: Create comment in JSON mode
- **WHEN** user runs `ct add-comment <projectId> <issueId> "some content" --json`
- **THEN** the CLI outputs the created comment object as JSON

#### Scenario: Empty content
- **WHEN** user runs `ct add-comment <projectId> <issueId> ""`
- **THEN** the CLI exits with code 4 (ValidationError) and displays a validation error

#### Scenario: Content exceeds max length
- **WHEN** user runs `ct add-comment <projectId> <issueId>` with content exceeding 5000 characters
- **THEN** the CLI exits with code 4 (ValidationError) and displays a validation error

### Requirement: Update a comment
The CLI SHALL provide an `edit-comment <projectId> <issueId> <commentId> <content>` command that updates an existing comment. Only the comment author SHALL be allowed to edit (enforced server-side).

#### Scenario: Update comment successfully
- **WHEN** user runs `ct edit-comment <projectId> <issueId> <commentId> "updated content"`
- **THEN** the CLI updates the comment and displays the updated comment details

#### Scenario: Update comment in JSON mode
- **WHEN** user runs `ct edit-comment <projectId> <issueId> <commentId> "updated" --json`
- **THEN** the CLI outputs the updated comment object as JSON

#### Scenario: Non-author attempts to edit
- **WHEN** a user who is not the comment author runs `ct edit-comment`
- **THEN** the CLI exits with code 2 (AuthError) and displays a forbidden error

### Requirement: Delete a comment
The CLI SHALL provide a `delete-comment <projectId> <issueId> <commentId>` command that deletes a comment. Only the comment author SHALL be allowed to delete (enforced server-side). In human-readable mode, the CLI SHALL prompt for confirmation unless `--force` is provided. In JSON mode, deletion proceeds without confirmation.

#### Scenario: Delete comment with confirmation
- **WHEN** user runs `ct delete-comment <projectId> <issueId> <commentId>` in human mode
- **THEN** the CLI prompts for confirmation before deleting

#### Scenario: Delete comment with --force
- **WHEN** user runs `ct delete-comment <projectId> <issueId> <commentId> --force`
- **THEN** the CLI deletes without confirmation and displays success message

#### Scenario: Delete comment in JSON mode
- **WHEN** user runs `ct delete-comment <projectId> <issueId> <commentId> --json`
- **THEN** the CLI deletes without confirmation and outputs `{ "success": true }` as JSON

#### Scenario: Non-author attempts to delete
- **WHEN** a user who is not the comment author runs `ct delete-comment`
- **THEN** the CLI exits with code 2 (AuthError) and displays a forbidden error

### Requirement: Schema introspection includes comment commands
The `schema` command output SHALL include all 5 comment commands with their arguments, options, and descriptions, so AI agents can discover comment capabilities.

#### Scenario: Schema includes comment commands
- **WHEN** user runs `ct schema`
- **THEN** the JSON output includes entries for `comments`, `comment`, `add-comment`, `edit-comment`, and `delete-comment` commands

### Requirement: CLI documentation covers comment commands
The `README.md` SHALL document all 5 comment commands with usage examples in both English and 繁體中文 sections.

#### Scenario: README contains comment command reference
- **WHEN** a user reads the CLI README
- **THEN** they find usage examples for all comment commands including `--json` and `--force` flags

### Requirement: Agent skill includes comment workflow
The `SKILL.md` SHALL include comment commands in the CLI command reference and provide workflow guidance for AI agents to use comments effectively (e.g., posting investigation results, adding context).

#### Scenario: Skill file references comment commands
- **WHEN** an AI agent reads the installed skill file
- **THEN** it finds comment command usage examples and understands when to use comments in its workflow
