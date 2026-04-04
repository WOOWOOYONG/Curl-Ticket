## Why

NOTIF-005 and NOTIF-007 are the two remaining planned notification features in the PRD. NOTIF-007 closes the feedback loop for issue reporters — when someone changes the status of their reported bug, they should know about it without polling the dashboard. NOTIF-005 makes all issue-related notifications (both `issue_update` and `issue_comment`) actionable by navigating the user directly to the relevant issue page on click.

Additionally, once notification volume grows, marking notifications one-by-one creates unnecessary friction. Users need a fast way to clear the unread badge after reviewing the notification list.

## Non-goals

- Notifications for non-status field changes (title, description, etc.) — defer until subscription/preference system exists.
- Notification preferences or unsubscribe mechanism.
- Notifying assignees (assignee feature does not exist yet).

## What Changes

- **Issue status change notification (NOTIF-007)**: When an issue's `status` field is updated via `PATCH /api/projects/:projectId/issues/:issueId`, the system creates a notification for the issue creator (`created_by`). Self-updates (updater === creator) are skipped.
- **Notification click navigation (NOTIF-005)**: Clicking an `issue_update` or `issue_comment` notification marks it as read and navigates to `/projects/:projectId/issues/:issueId`. The notification API is extended to return `projectId` via a JOIN on the `issues` table (no schema change needed).
- **Mark all notifications as read**: Add `PATCH /api/notifications/read-all` to mark all unread notifications for the current user as read. Add a NotificationBell header action with i18n label (`notifications.markAllAsRead`) to trigger this endpoint.

## Capabilities

### New Capabilities

- `issue-status-notification`: Server-side logic to detect issue status changes and create notifications for the issue creator.
- `notification-navigate`: Frontend click handler that navigates to the issue detail page for issue-related notification types.
- `notification-mark-all-read`: Server and frontend flow for marking all unread notifications as read in one action.

### Modified Capabilities

_(none — no existing spec-level requirements are changing)_

## Impact

- **Server API**: `PATCH /api/projects/:projectId/issues/:issueId` gains notification insertion logic. `GET /api/notifications` adds a LEFT JOIN on `issues` to return `projectId`.
- **Server API**: Add `PATCH /api/notifications/read-all` for bulk read updates (scoped by current user).
- **Frontend**: `NotificationBell.vue` click handler updated to call `navigateTo()` for issue-related types, and adds a "mark all as read" action with loading/disabled states.
- **Database**: No schema migration required — uses existing `notifications.issue_id` FK and JOINs `issues.project_id`.
- **i18n**: Add `notifications.markAllAsRead` in `en` and `zh-TW` locale files.
- **PRD**: `NOTIF-005` status changes from "後續擴充" to implemented. `NOTIF-007` status changes from `[Planned]` to implemented.
