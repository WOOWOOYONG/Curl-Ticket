## ADDED Requirements

### Requirement: Author can edit their own comment
The system SHALL allow comment authors to update the content of their own comments. Only the `content` field SHALL be editable.

#### Scenario: Successful comment edit
- **WHEN** the comment author sends a PATCH request to `/api/projects/:projectId/issues/:issueId/comments/:commentId` with a valid `content` body
- **THEN** the system SHALL update the comment's `content` and set `updated_at` to the current timestamp
- **THEN** the system SHALL return the updated comment with `updatedAt` populated

#### Scenario: Non-author attempts to edit
- **WHEN** a user who is NOT the comment author sends a PATCH request to edit the comment
- **THEN** the system SHALL return a 403 Forbidden error
- **THEN** the comment SHALL remain unchanged

#### Scenario: Edit with invalid content
- **WHEN** a PATCH request is sent with empty content or content exceeding 5000 characters
- **THEN** the system SHALL return a 400 Bad Request error with validation details

#### Scenario: Edit with disallowed HTML tags
- **WHEN** a PATCH request is sent with content containing HTML tags not in the allowlist
- **THEN** the system SHALL return a 400 Bad Request error

#### Scenario: Comment not found
- **WHEN** a PATCH request is sent for a comment ID that does not exist
- **THEN** the system SHALL return a 404 Not Found error

### Requirement: Inline edit UI in comment card
The system SHALL provide an inline editing experience within the comment card, matching GitHub's comment editing pattern.

#### Scenario: User enters edit mode
- **WHEN** the comment author clicks "Edit" from the comment's `...` popover menu
- **THEN** the comment body SHALL be replaced with a rich text editor (`UEditor`) pre-populated with the existing comment content
- **THEN** the editor SHALL display the same toolbar as the comment composer
- **THEN** "Save" and "Cancel" buttons SHALL appear below the editor

#### Scenario: User saves an edit
- **WHEN** the user modifies the content in the inline editor and clicks "Save"
- **THEN** the system SHALL send a PATCH request with the updated content
- **THEN** the comment SHALL refresh and display the updated content
- **THEN** the inline editor SHALL be dismissed and the comment body SHALL return to read mode

#### Scenario: User cancels an edit
- **WHEN** the user clicks "Cancel" while editing a comment
- **THEN** the inline editor SHALL be dismissed without saving
- **THEN** the original comment content SHALL be restored

#### Scenario: Only one comment editable at a time
- **WHEN** the user clicks "Edit" on a comment while another comment is already in edit mode
- **THEN** the previously editing comment SHALL exit edit mode (discard unsaved changes)
- **THEN** the newly selected comment SHALL enter edit mode

#### Scenario: Edit button visibility
- **WHEN** a comment is displayed and the current user is the comment author
- **THEN** the "Edit" action SHALL be visible in the comment's `...` popover menu
- **WHEN** the current user is NOT the comment author
- **THEN** the "Edit" action SHALL NOT be visible

### Requirement: Edited indicator display
The system SHALL display an "(edited)" indicator on comments that have been modified after creation.

#### Scenario: Comment has been edited
- **WHEN** a comment's `updatedAt` value is not null
- **THEN** the text "(edited)" SHALL be displayed next to the comment timestamp in the card header

#### Scenario: Comment has never been edited
- **WHEN** a comment's `updatedAt` value is null
- **THEN** no "(edited)" indicator SHALL be displayed

### Requirement: Database schema includes updated_at
The `issue_comments` table SHALL include an `updated_at` column to track when a comment was last edited.

#### Scenario: New comment created
- **WHEN** a new comment is inserted into the database
- **THEN** the `updated_at` column SHALL be null

#### Scenario: Comment is edited
- **WHEN** a comment's content is updated via the PATCH endpoint
- **THEN** the `updated_at` column SHALL be set to the current timestamp
