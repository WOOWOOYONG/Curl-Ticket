## ADDED Requirements

### Requirement: Skill packaging and discovery

The `curl-ticket-create-task` skill SHALL ship as a single `SKILL.md` file under `packages/cli/skills/curl-ticket-create-task/` and MUST be included in the `files` array of `packages/cli/package.json` so it is published to npm.

#### Scenario: Skill file is published with the CLI
- **WHEN** a user installs `@curl-ticket/cli` from npm
- **THEN** the installed package contains `skills/curl-ticket-create-task/SKILL.md`

#### Scenario: Skill metadata identifies the trigger
- **WHEN** a host loads the SKILL.md frontmatter
- **THEN** the `name` field equals `curl-ticket-create-task` and the `description` field describes triggering on phrases such as "create task", "新增 task", "add task", "open ticket as task"

### Requirement: Mode detection

The skill SHALL classify each invocation into one of two modes — **Step-by-step** or **Fast Path** — using a deterministic three-layer decision tree, before asking any question. Project and assignee SHALL always be re-prompted unless explicitly resolvable from the message.

#### Scenario: Explicit keyword forces Fast Path
- **WHEN** the trigger message contains any of `from this PRD`, `parse this`, `依這份`, `根據以下`, `直接建`, `skip questions`
- **THEN** the skill enters Fast Path regardless of structural signals

#### Scenario: Explicit keyword forces Step-by-step
- **WHEN** the trigger message contains any of `step by step`, `one by one`, `逐題`, `問我`
- **THEN** the skill enters Step-by-step regardless of structural signals

#### Scenario: Short trigger message defaults to Step-by-step
- **WHEN** the trigger message is two lines or fewer with no Markdown headings, bullet lists, or `[A-Z]+-\d+` IDs
- **THEN** the skill enters Step-by-step

#### Scenario: Structured payload becomes a Fast Path candidate
- **WHEN** the trigger message has three or more lines, OR contains a Markdown heading, bullet list, or a token matching `[A-Z]+-\d+(\.\d+)*`
- **THEN** the skill becomes a Fast Path candidate and proceeds to extraction

#### Scenario: All three core fields extractable
- **WHEN** the skill can extract non-empty title, why, and acceptance criteria from the message
- **THEN** the skill enters Fast Path and skips the per-field prompts for those three fields

#### Scenario: Partial extraction asks user to choose
- **WHEN** the skill extracts at least one but not all three core fields
- **THEN** the skill asks the user once via `AskUserQuestion` to choose between `Use auto-derived values` and `Ask me one by one`, and proceeds accordingly

#### Scenario: Title or why missing falls back to Step-by-step
- **WHEN** the skill cannot extract title or why
- **THEN** the skill falls back to Step-by-step and surfaces the pasted text as a hint inside each question prompt

#### Scenario: Project and assignee are not auto-derived by default
- **WHEN** Fast Path is selected
- **THEN** the skill still resolves project via the existing rules (skip if exactly one project, otherwise prompt) and still prompts for assignee unless the message contains `@<name>` or `assign to <name>`

### Requirement: Interactive question flow

The skill SHALL drive the host (e.g. Claude Code) to ask the user, in order, for: project, title, why, acceptance criteria, assignee. Each question MUST be a separate `AskUserQuestion` invocation.

#### Scenario: Project selection with multiple projects
- **WHEN** `curl-ticket projects --json` returns two or more projects
- **THEN** the host presents each project as an option labelled `<name> (<key>)` with the project ID as the value, and accepts a pasted project ID as a free-form fallback

#### Scenario: Project selection with one project
- **WHEN** `curl-ticket projects --json` returns exactly one project
- **THEN** the skill skips the project question and uses that project's ID

#### Scenario: Project selection with no projects
- **WHEN** `curl-ticket projects --json` returns zero projects
- **THEN** the skill stops and instructs the user to create a project first

#### Scenario: Title is required and bounded
- **WHEN** the user submits a title
- **THEN** the skill trims whitespace and rejects empty strings or strings longer than 200 characters, re-asking until valid

#### Scenario: Acceptance criteria normalisation
- **WHEN** the user enters multiple lines of acceptance criteria
- **THEN** the skill normalises each non-empty line into a Markdown bullet (`- <line>`), stripping any leading `- ` the user already typed

### Requirement: Assignee resolution

The skill SHALL resolve the assignee using the same rules as `curl-ticket-issue-analyzer`: `me`, `none`/`null`, UUID, email, or natural-language name (case-insensitive match against `curl-ticket members <projectId> --json` on `name`, falling back to email local-part).

#### Scenario: Default assignee is the current user
- **WHEN** the user submits an empty assignee answer
- **THEN** the skill passes `--assignee me` to `curl-ticket create-issue`

#### Scenario: Name resolves to a single member
- **WHEN** the user enters a name that matches exactly one member case-insensitively
- **THEN** the skill passes that member's email or userId to `--assignee`

#### Scenario: Name matches multiple members
- **WHEN** the user enters a name that matches two or more members
- **THEN** the skill lists the candidates with their emails and asks the user to confirm which one to use

#### Scenario: Name matches no member
- **WHEN** the user enters a name that does not match any member
- **THEN** the skill reports that no such member exists in the project and re-asks for an assignee

### Requirement: Description Markdown template

The skill SHALL assemble the issue description from a fixed Markdown template containing `## Why`, `## Acceptance Criteria`, and `## Notes` sections, mirroring `packages/cli/src/templates/task.md` so the skill and `--interactive` produce identical output.

#### Scenario: SKILL.md inlines the same structure
- **WHEN** a developer reads the SKILL.md template section
- **THEN** the inline Markdown matches the section names and placeholder semantics defined in `cli-issue-description-template`

#### Scenario: Template includes provided sections
- **WHEN** the user provides a why and at least one acceptance criterion
- **THEN** the description body matches `## Why\n<why>\n\n## Acceptance Criteria\n- <item>\n...`

#### Scenario: Empty why is preserved structurally
- **WHEN** the user leaves the why blank
- **THEN** the description still contains the `## Why` heading with a placeholder line (e.g. `_(not provided)_`)

### Requirement: Preview and confirmation gate

The skill SHALL display a preview of the assembled title and description, and MUST NOT call `curl-ticket create-issue` until the user explicitly confirms.

#### Scenario: Preview is shown before mutation
- **WHEN** all answers are collected
- **THEN** the host renders the title and description preview and asks the user to choose `Confirm`, `Edit`, or `Cancel`

#### Scenario: Fast Path preview labels auto-derived fields
- **WHEN** the skill enters Fast Path or Hybrid (partial extraction accepted)
- **THEN** the preview includes an `[Auto-derived from your message]` marker before the listed fields, so the user can spot Agent-inferred values

#### Scenario: Edit returns to the relevant question
- **WHEN** the user picks `Edit`
- **THEN** the skill asks which field to change and re-runs only that question, then shows a fresh preview

#### Scenario: Cancel aborts without side effects
- **WHEN** the user picks `Cancel`
- **THEN** the skill exits without calling any mutating CLI command

### Requirement: CLI invocation and result reporting

On confirm, the skill SHALL invoke `curl-ticket create-issue <projectId> --type task --title <title> --description <markdown> --assignee <resolved> --json` and report the resulting `friendlyId` and issue URL.

#### Scenario: Successful creation
- **WHEN** the CLI returns exit code 0 with a JSON payload
- **THEN** the skill outputs the `friendlyId` (e.g. `CT-42`) and the issue URL from the payload

#### Scenario: CLI reports a validation error
- **WHEN** the CLI returns exit code 4
- **THEN** the skill surfaces the `message` field, does not retry automatically, and offers to re-edit the inputs

#### Scenario: CLI reports auth or network errors
- **WHEN** the CLI returns exit code 2 or 5
- **THEN** the skill surfaces the error message and instructs the user to run `curl-ticket auth` or check connectivity, without retrying
