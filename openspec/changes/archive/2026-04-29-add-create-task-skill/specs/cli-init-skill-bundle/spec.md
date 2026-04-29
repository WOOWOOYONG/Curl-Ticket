## ADDED Requirements

### Requirement: Multi-skill installation manifest

The `curl-ticket init-skill` command SHALL maintain an internal manifest of installable skills and MUST include `curl-ticket-create-task` alongside the existing `curl-ticket-issue-analyzer` skill.

#### Scenario: Manifest exposes both skills
- **WHEN** a user runs `curl-ticket init-skill`
- **THEN** the command lists `curl-ticket-issue-analyzer` and `curl-ticket-create-task` as available skills

#### Scenario: New skill source path is resolved from the package
- **WHEN** the install routine reads a skill source
- **THEN** it resolves the file from `<packageRoot>/skills/<skill-name>/SKILL.md` so it works for both local development and globally installed CLI

### Requirement: Non-destructive overwrite handling

When the destination file for a skill already exists, the install routine SHALL prompt the user before overwriting and MUST default to skipping.

#### Scenario: Destination already exists
- **WHEN** `<destination>/SKILL.md` exists for a selected skill
- **THEN** the user is prompted to overwrite or skip, and skipping leaves the existing file unchanged

#### Scenario: Fresh install
- **WHEN** the destination directory does not exist
- **THEN** the install routine creates the directory tree and writes the SKILL.md without prompting

### Requirement: Selection UX parity

The `init-skill` command SHALL allow users to install all skills at once or select a subset, using the same interaction pattern already implemented for the existing skill.

#### Scenario: Install all skills
- **WHEN** the user opts to install all skills
- **THEN** every skill in the manifest is installed, subject to the overwrite rules above

#### Scenario: Install a subset
- **WHEN** the user selects only `curl-ticket-create-task`
- **THEN** only that skill's SKILL.md is written; the analyzer skill is not touched
