## ADDED Requirements

### Requirement: Template registry

Description templates SHALL live as Markdown files under `packages/cli/src/templates/<name>.md` and MUST be bundled into the CLI tarball via the `files` field in `packages/cli/package.json`.

#### Scenario: Templates ship with the package
- **WHEN** a user installs `@curl-ticket/cli` from npm
- **THEN** the installed package contains `templates/task.md`

#### Scenario: Template lookup is case-sensitive
- **WHEN** the CLI resolves `--from-template task`
- **THEN** it loads `templates/task.md` and treats names as case-sensitive (no implicit lowercasing)

### Requirement: Task template content

The `task` template SHALL contain `## Why`, `## Acceptance Criteria`, `## Notes`, and `## References` sections in that order, each with a placeholder body that is substituted at runtime.

#### Scenario: Placeholders documented
- **WHEN** a developer reads `templates/task.md`
- **THEN** the file uses `{{why}}`, `{{acceptance_criteria}}`, `{{notes}}`, and `{{references}}` as the only placeholders

#### Scenario: Empty `why` becomes a marker
- **WHEN** the substituted `why` value is an empty string
- **THEN** the rendered output replaces `{{why}}` with `_(not provided)_`

#### Scenario: Empty optional sections are dropped
- **WHEN** the substituted `acceptance_criteria`, `notes`, or `references` value is empty
- **THEN** the rendered output removes the entire heading and body for that section, including the preceding blank line

#### Scenario: References section receives bullet-list IDs
- **WHEN** the skill (in Fast Path) extracts requirement IDs matching `[A-Z]+-\d+(\.\d+)*` from the user's message
- **THEN** each unique ID is rendered as a `- <ID>` bullet under the `## References` section in the order of first appearance

### Requirement: `--from-template` flag

The `curl-ticket create-issue` command SHALL accept a `--from-template <name>` flag that resolves to a registered template and uses it as the description source.

#### Scenario: Print mode without `--interactive`
- **WHEN** the user runs `curl-ticket create-issue --type task --from-template task`
- **THEN** the CLI prints the rendered template (with empty placeholders substituted) to stdout and exits with code 0 without calling the API

#### Scenario: Pre-fill mode with `--interactive`
- **WHEN** the user runs `curl-ticket create-issue --type task --from-template task --interactive`
- **THEN** the CLI parses the template into the why / acceptance criteria / notes prompts as default answers

#### Scenario: Conflict with `--description`
- **WHEN** the user passes both `--from-template` and `--description`
- **THEN** the CLI exits with code 4 and a message that the two flags are mutually exclusive

#### Scenario: Unknown template name
- **WHEN** the user passes `--from-template unknown`
- **THEN** the CLI exits with code 4 listing the available template names

### Requirement: Skill alignment

The `curl-ticket-create-task` skill SHALL inline a copy of the task template structure in its SKILL.md and MUST cite `packages/cli/src/templates/task.md` as the source of truth.

#### Scenario: SKILL.md cites the template path
- **WHEN** a developer reads the skill's description-template section
- **THEN** the section references `packages/cli/src/templates/task.md` as the canonical source
