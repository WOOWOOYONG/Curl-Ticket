## ADDED Requirements

### Requirement: View project detail

The CLI SHALL provide a `ct project <projectId>` command that displays project details including name, key, description, total issues count, and open issues count.

#### Scenario: View project in human-readable mode

- **WHEN** user runs `ct project <projectId>`
- **THEN** the CLI displays the project name, key, description, total issues, and open issues in a readable format

#### Scenario: View project in JSON mode

- **WHEN** user runs `ct project <projectId> --json`
- **THEN** the CLI outputs the raw JSON response from `GET /api/projects/:projectId`

#### Scenario: Project not found

- **WHEN** user runs `ct project <projectId>` with a non-existent or inaccessible project ID
- **THEN** the CLI reports `Resource not found.` and exits with `ExitCode.NotFound`

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
