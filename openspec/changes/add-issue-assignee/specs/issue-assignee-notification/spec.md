## ADDED Requirements

### Requirement: Notify newly assigned user on assignment change

When an issue's `assigneeId` is changed via `POST /api/projects/:projectId/issues` or `PATCH /api/projects/:projectId/issues/:issueId`, the system SHALL create a notification for the new assignee of type `issue_update` provided that (a) the new assignee is non-null, (b) the new assignee differs from the previous value, and (c) the new assignee is not the acting user. The notification SHALL be written inside the same database transaction as the issue write.

#### Scenario: User A assigns issue CT-42 to user B

- **WHEN** user A updates issue CT-42 with `{ "assigneeId": B }` and the previous assignee was NULL or a different user
- **THEN** a notification is created with:
  - `userId` = B
  - `issueId` = CT-42's id
  - `type` = `issue_update`
  - `title` = `Issue CT-42 assigned to you`
  - `content` = the issue's current `title`

#### Scenario: Assignee unchanged

- **WHEN** user A sends a PATCH with `{ "assigneeId": B }` and the issue's current `assigneeId` is already `B`
- **THEN** no notification is created

#### Scenario: Self-assignment emits no notification

- **WHEN** user A sets `assigneeId` to their own id
- **THEN** no notification is created (self-assign is skipped)

#### Scenario: Unassigning emits no notification

- **WHEN** a user sets `assigneeId` to `null` from a previously non-null value
- **THEN** no notification is created

#### Scenario: Create with assignee triggers notification

- **WHEN** user A creates an issue with `assigneeId = B` (B ≠ A)
- **THEN** exactly one `issue_update` notification is created for user B, atomically with the issue insert

#### Scenario: Status change and assignee change in the same PATCH

- **WHEN** user A sends a single PATCH that both changes status (Open → In Progress) and assigns to user B (B ≠ A, B ≠ issue creator)
- **THEN** two notifications are created in the same transaction: one to the issue creator for the status change (per `issue-status-notification`) and one to user B for the assignee change

### Requirement: Assignee notification is delivered via the existing bell feed

The notification written for an assignee change SHALL be visible in the same bell UI as other `issue_update` notifications and SHALL be markable as read via the existing `PATCH /api/notifications/:notificationId/read` endpoint. No new notification type or UI surface is introduced.

#### Scenario: Assigned user sees notification in bell

- **WHEN** user B was just assigned CT-42 by user A, then user B opens the in-app bell
- **THEN** a new unread entry "Issue CT-42 assigned to you" appears in the list, sorted alongside other `issue_update` notifications

#### Scenario: Mark assignee notification as read

- **WHEN** user B clicks the "Issue CT-42 assigned to you" entry
- **THEN** the existing mark-as-read endpoint sets `read_at` and the entry is no longer counted as unread
