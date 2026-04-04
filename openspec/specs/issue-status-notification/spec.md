# issue-status-notification Specification

## Purpose
TBD - created by archiving change notify-issue-status-navigate. Update Purpose after archive.
## Requirements
### Requirement: Notify issue creator on status change

When an issue's `status` field is updated via `PATCH /api/projects/:projectId/issues/:issueId`, the system SHALL create a notification record for the issue creator (`created_by`) with type `issue_update`. The notification SHALL include the issue's friendly ID in the title and the old-to-new status transition in the content.

#### Scenario: Status changed by another user

- **WHEN** user A updates issue CT-42 status from `Open` to `In Progress`, and issue CT-42 was created by user B
- **THEN** a notification is created with:
  - `userId` = user B's ID
  - `issueId` = CT-42's ID
  - `type` = `issue_update`
  - `title` = `Issue CT-42 status updated`
  - `content` = `Open → In Progress`

#### Scenario: Status changed by the issue creator themselves

- **WHEN** user A updates their own issue CT-42 status from `Open` to `Done`
- **THEN** no notification is created (self-update is skipped)

#### Scenario: Non-status fields updated

- **WHEN** user A updates issue CT-42's `title` or `description` without changing `status`
- **THEN** no notification is created (only status changes trigger notifications)

#### Scenario: Status field included but value unchanged

- **WHEN** user A sends a PATCH with `{ "status": "Open" }` and the issue's current status is already `Open`
- **THEN** no notification is created (no actual change occurred)

