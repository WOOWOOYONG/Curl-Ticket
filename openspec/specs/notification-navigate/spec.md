# notification-navigate Specification

## Purpose
TBD - created by archiving change notify-issue-status-navigate. Update Purpose after archive.
## Requirements
### Requirement: Notifications API returns projectId for issue-related notifications

The `GET /api/notifications` endpoint SHALL return an `issueProjectId` field for notifications that have an `issueId`. This field SHALL be populated by LEFT JOINing the `issues` table on `notifications.issueId` to fetch `issues.projectId`.

#### Scenario: Notification with issueId

- **WHEN** the notifications list is fetched and a notification has `issueId` referencing an existing issue in project `abc-123`
- **THEN** the notification object includes `issueProjectId: "abc-123"`

#### Scenario: Notification without issueId

- **WHEN** the notifications list is fetched and a notification has `issueId: null` (e.g., a `project_invite` notification)
- **THEN** the notification object includes `issueProjectId: null`

### Requirement: Click issue-related notification to navigate to issue page

When a user clicks an `issue_update` or `issue_comment` notification in the NotificationBell popover, the system SHALL mark the notification as read and navigate to `/projects/:projectId/issues/:issueId` using the `issueProjectId` and `issueId` from the notification data.

#### Scenario: Click issue_update notification

- **WHEN** user clicks an unread `issue_update` notification with `issueProjectId: "abc-123"` and `issueId: 42`
- **THEN** the notification is marked as read, the popover closes, and the user is navigated to `/projects/abc-123/issues/42`

#### Scenario: Click issue_comment notification

- **WHEN** user clicks an unread `issue_comment` notification with `issueProjectId: "abc-123"` and `issueId: 42`
- **THEN** the notification is marked as read, the popover closes, and the user is navigated to `/projects/abc-123/issues/42`

#### Scenario: Click already-read issue notification

- **WHEN** user clicks an already-read `issue_update` notification
- **THEN** markAsRead is not called again, but navigation still occurs

#### Scenario: Notification missing issueProjectId

- **WHEN** user clicks an `issue_update` notification where `issueProjectId` is null (edge case)
- **THEN** the notification is marked as read but no navigation occurs

### Requirement: Mark all unread notifications as read

The system SHALL provide `PATCH /api/notifications/read-all` to mark all unread notifications as read for the authenticated user only.

#### Scenario: User has unread notifications

- **WHEN** authenticated user A calls `PATCH /api/notifications/read-all` and has 3 unread notifications
- **THEN** exactly those 3 notifications belonging to user A are updated to `isRead: true`
- **AND** the API response includes `updatedCount: 3`

#### Scenario: User has no unread notifications

- **WHEN** authenticated user A calls `PATCH /api/notifications/read-all` and has no unread notifications
- **THEN** no rows are updated
- **AND** the API response includes `updatedCount: 0`

#### Scenario: Other users' notifications remain unchanged

- **WHEN** authenticated user A calls `PATCH /api/notifications/read-all`
- **THEN** notifications belonging to any other user B are not modified

### Requirement: NotificationBell supports bulk read action with i18n

The NotificationBell popover SHALL expose a "mark all as read" action that triggers bulk read behavior and uses locale-specific text via `notifications.markAllAsRead`.

#### Scenario: Trigger bulk read from NotificationBell

- **WHEN** user clicks the NotificationBell header action while `unreadCount > 0`
- **THEN** the UI enters loading state
- **AND** invokes bulk read action
- **AND** refreshes notifications and unread count after completion

#### Scenario: Disable action when no unread notifications

- **WHEN** `unreadCount` is `0`
- **THEN** the NotificationBell bulk read action is disabled

#### Scenario: Locale-specific button label

- **WHEN** app locale is `en`
- **THEN** the action label is `Mark all as read`
- **WHEN** app locale is `zh-TW`
- **THEN** the action label is `已讀全部通知`

