## ADDED Requirements

### Requirement: Issue has an optional assignee

Each issue SHALL have an `assigneeId` field that is either NULL (unassigned) or the `id` of a profile that is a member or the owner of the issue's project. Every API response that returns an issue SHALL include an `assignee` object (`id`, `name`, `email`) or `null` when unassigned.

#### Scenario: Issue created without assignee

- **WHEN** the user creates an issue and omits `assigneeId` in the request body
- **THEN** the issue is persisted with `assignee_id = NULL` and the API response returns `"assignee": null`

#### Scenario: Issue created with a project member as assignee

- **WHEN** user A creates an issue in project P and sets `assigneeId` to user B's profile id, where user B is a member of project P
- **THEN** the issue is persisted with `assignee_id = B` and the API response returns `"assignee": { "id": B, "name": ..., "email": ... }`

#### Scenario: Issue response still populates assignee after profile soft-delete

- **WHEN** an issue has `assignee_id = X` and user X's profile is later soft-deleted
- **THEN** the issue response returns `"assignee": null` (the join filter excludes soft-deleted profiles) while `assigneeId` in storage remains `X`

### Requirement: Any user with project access can change the assignee

The system SHALL accept `assigneeId` updates from any authenticated user who has access to the project (owner or member). The system SHALL NOT require any additional role or permission beyond project access.

#### Scenario: Regular member reassigns an issue

- **WHEN** a project member (non-owner) sends `PATCH /api/projects/:projectId/issues/:issueId` with `{ "assigneeId": <other-member-id> }`
- **THEN** the request succeeds with HTTP 200 and the issue's assignee is updated

#### Scenario: User outside the project attempts to reassign

- **WHEN** a user who is neither the project owner nor a project member sends a PATCH with an `assigneeId` change
- **THEN** the request is rejected with HTTP 404 by the existing project-access check (before assignee logic runs)

### Requirement: Assignee must be a project owner or member

When `assigneeId` is a non-null UUID, the system SHALL reject the request with HTTP 400 unless that id belongs to the project's owner or to a row in `project_members` for this project. When `assigneeId` is `null`, the system SHALL always accept the change.

#### Scenario: Assignee is a project member

- **WHEN** the caller sets `assigneeId` to user B's id and user B is in `project_members` for the project
- **THEN** the request is accepted and the assignee is updated to user B

#### Scenario: Assignee is the project owner

- **WHEN** the caller sets `assigneeId` to the project owner's id
- **THEN** the request is accepted (the owner is always an allowed assignee even without a `project_members` row)

#### Scenario: Assignee is not a member or owner

- **WHEN** the caller sets `assigneeId` to user C's id and user C is neither the project owner nor a member
- **THEN** the request is rejected with HTTP 400 and the issue's `assignee_id` is unchanged

#### Scenario: Unassign by setting to null

- **WHEN** the caller sends `{ "assigneeId": null }` for an issue that currently has an assignee
- **THEN** the request is accepted and the issue's `assignee_id` becomes NULL

### Requirement: Assignee dropdown options come from project members

The client issue form SHALL populate its "Assignee" dropdown from `GET /api/projects/:projectId/members`, plus a synthetic "Unassigned" option with value `null`. The acting user SHALL appear in the options when they are a member of the project.

#### Scenario: Form lists all project members plus Unassigned

- **WHEN** the user opens the issue form for a project with members B, C, and D (in addition to the owner A)
- **THEN** the assignee dropdown lists "Unassigned", A, B, C, and D

#### Scenario: Self-assignment is permitted from the dropdown

- **WHEN** user B (a member) opens the dropdown
- **THEN** user B appears as a selectable option and picking themselves is a valid submission

### Requirement: Assignee visible in issue list and detail views

The issue list and detail views SHALL render the current assignee's name (or a clear "Unassigned" label when none is set). The detail view SHALL allow changing the assignee inline without leaving the page.

#### Scenario: List item shows assigned user

- **WHEN** an issue row is rendered and it has a non-null assignee
- **THEN** the row displays the assignee's display name (or email fallback if name is missing)

#### Scenario: List item shows unassigned state

- **WHEN** an issue row is rendered and `assignee` is null
- **THEN** the row displays "Unassigned" (localized per `i18n-ui-strings`)
