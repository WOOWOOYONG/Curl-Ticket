## ADDED Requirements

### Requirement: Issue creator can delete their own issue

The system SHALL allow the user who created an issue to permanently delete it via `DELETE /api/projects/:projectId/issues/:issueId`. The system SHALL remove the issue and all associated comments and notifications.

#### Scenario: Creator deletes their own issue

- **WHEN** the issue creator sends a DELETE request to `/api/projects/:projectId/issues/:issueId`
- **THEN** the system deletes the issue, returns `{ success: true }`, and cascading deletes remove all related comments and notifications

#### Scenario: Creator deletes issue with comments

- **WHEN** the issue creator deletes an issue that has 3 comments and 2 notifications
- **THEN** the issue, all 3 comments, and all 2 notifications are permanently removed from the database

### Requirement: Project owner can delete any issue in their project

The system SHALL allow the project owner to delete any issue within their project, regardless of who created it.

#### Scenario: Project owner deletes another user's issue

- **WHEN** the project owner sends a DELETE request for an issue created by another user
- **THEN** the system deletes the issue and returns `{ success: true }`

### Requirement: Non-authorized users cannot delete issues

The system SHALL reject delete requests from users who are neither the issue creator nor the project owner with a 403 Forbidden error.

#### Scenario: Regular member attempts to delete another user's issue

- **WHEN** a project member who is not the issue creator and not the project owner sends a DELETE request
- **THEN** the system returns 403 Forbidden with message indicating insufficient permissions

#### Scenario: Non-member attempts to delete an issue

- **WHEN** a user who is not a project member sends a DELETE request
- **THEN** the system returns 404 Not Found (project not accessible)

### Requirement: Delete non-existent issue returns 404

The system SHALL return 404 when attempting to delete an issue that does not exist or does not belong to the specified project.

#### Scenario: Delete with invalid issue ID

- **WHEN** a user sends a DELETE request with an issue ID that does not exist
- **THEN** the system returns 404 Not Found

### Requirement: Issue detail page shows delete button with confirmation

The system SHALL display a delete button on the issue detail page sidebar. Clicking it SHALL open a confirmation modal before executing the deletion.

#### Scenario: User clicks delete and confirms

- **WHEN** the user clicks the delete button on the issue detail page and confirms in the modal
- **THEN** the system sends a DELETE request, shows a success toast, and navigates back to the project issues list

#### Scenario: User clicks delete and cancels

- **WHEN** the user clicks the delete button and then cancels in the confirmation modal
- **THEN** no delete request is sent and the user remains on the issue detail page

#### Scenario: Delete request fails

- **WHEN** the user confirms deletion but the server returns an error
- **THEN** the system shows an error toast and the user remains on the issue detail page
