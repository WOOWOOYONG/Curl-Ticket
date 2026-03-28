## Capability: issue-create

### Requirement: Post-create navigation preserves issue type tab
After a user successfully creates an issue, the system SHALL navigate to the project list page with a `?type=<issueType>` query parameter matching the type of the issue that was just created, so the correct tab is active on arrival.

#### Scenario: Create API Bug — lands on API Bug tab
- **WHEN** the user submits a new issue with type `ApiBug`
- **THEN** the system navigates to `/projects/<id>?type=api-bug` and the API Bug tab is active

#### Scenario: Create Task — lands on Task tab
- **WHEN** the user submits a new issue with type `Task`
- **THEN** the system navigates to `/projects/<id>?type=task` and the Task tab is active

### Requirement: Back link in create form preserves issue type tab
In create mode, the "Back" navigation link SHALL include `?type=<activeIssueType>` so that returning to the project list without submitting also preserves the tab the user had selected on the form.

#### Scenario: Back link with Task tab selected
- **WHEN** the user is on the create form with the Task tab selected and clicks the back link
- **THEN** the system navigates to `/projects/<id>?type=task` and the Task tab is active

#### Scenario: Back link with API Bug tab selected
- **WHEN** the user is on the create form with the API Bug tab selected and clicks the back link
- **THEN** the system navigates to `/projects/<id>?type=api-bug` and the API Bug tab is active
