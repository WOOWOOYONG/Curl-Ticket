## Context

The notification system already supports two creation flows (comment → `issue_comment`, invitation → `project_invite`) and a frontend popover with Supabase Realtime push. The `notifications` table has an `issueId` FK to `issues` but no direct `projectId` column. The `NotificationBell.vue` click handler currently only opens a modal for `project_invite` type; issue-related notifications just get marked as read with no navigation.

The notification center also only supports single-item read actions. There is no bulk action to clear unread notifications after users review a batch.

Key existing patterns to follow:
- `comments.post.ts` inserts a notification after the main operation, checking `issue.createdBy !== userId` before inserting.
- `index.get.ts` already LEFT JOINs `projectInvitations` and `projects` to enrich notification data.
- `[issueId].patch.ts` currently fetches the existing issue (for type checking) before updating, but only selects `issueType` — needs to also select `status` and `createdBy`.

## Goals / Non-Goals

**Goals:**
- Create `issue_update` notifications when an issue's status field changes (NOTIF-007)
- Enable click-to-navigate for `issue_update` and `issue_comment` notifications (NOTIF-005)
- Add bulk "mark all as read" action in NotificationBell with i18n labels
- Follow existing notification patterns for consistency

**Non-Goals:**
- Notifications for non-status field changes
- Notification preferences or subscription system
- Batch/digest notifications
- Schema migration (no new columns)

## Decisions

### 1. Status change detection: compare before/after in the existing PATCH handler

The `[issueId].patch.ts` handler already queries the existing issue before updating (line 36-39, selecting `issueType`). Extend this SELECT to also fetch `status`, `createdBy`, `projectKey`, and `issueNumber`. After the update, compare `existing.status` vs `result.data.status` to detect a change.

**Alternative considered:** Database trigger on the `issues` table. Rejected because it would add hidden complexity outside the application layer, be harder to test, and diverge from the existing pattern where `comments.post.ts` inserts notifications inline.

### 2. projectId for navigation: LEFT JOIN `issues` in the notifications GET endpoint

Add a LEFT JOIN on `issues` (via `notifications.issueId`) to fetch `issues.projectId`. This is returned as `issueProjectId` in the response — naming matches the existing `invitationProjectId` pattern.

**Alternative considered:** Add a `projectId` column to `notifications` table. Rejected because it requires a migration, introduces data redundancy, and `issueId` already provides the relationship. The cascade delete on `issueId` ensures no orphaned references.

### 3. Frontend navigation: markAsRead first, then navigateTo

In `NotificationBell.vue`, when an `issue_update` or `issue_comment` notification is clicked:
1. Call `markAsRead(notification.id)` (fire-and-forget, no await)
2. Close popover
3. Call `navigateTo(`/projects/${issueProjectId}/issues/${issueId}`)` 

Mark-as-read happens before navigation so even if navigation fails, the notification is still marked read (per user's decision). The `markAsRead` call is already fire-and-forget in the existing code pattern.

### 4. Notification content format

Title: `Issue {KEY-NUM} status updated` (English, consistent with comment notification pattern)
Content: `{oldStatus} → {newStatus}` (concise, shows the delta)

Example: Title = `Issue CT-42 status updated`, Content = `Open → In Progress`

### 5. Bulk read API and UI: dedicated endpoint + composable action

Add a dedicated endpoint `PATCH /api/notifications/read-all` that updates all unread notifications for `event.context.userId` with one SQL update (`set isRead=true where user_id=:userId and is_read=false`). Return `updatedCount` for observability.

Expose this endpoint via `useNotifications().markAllAsRead()` and wire it to a header action button in `NotificationBell.vue`. The button is:
- disabled when `unreadCount === 0`
- loading while request is in-flight
- labeled via i18n key `notifications.markAllAsRead`

This keeps behavior consistent with existing composable boundaries (`markAsRead`, `refresh`) and avoids embedding API details directly inside the component.

## Risks / Trade-offs

- **[JOIN performance]** → The LEFT JOIN on `issues` adds one more join to the notifications query (now 3 JOINs total). With a LIMIT 50 and index on `notifications.user_id`, this is negligible. If it becomes a concern later, adding a denormalized `projectId` column is straightforward.
- **[Missing projectId on deleted issues]** → If an issue is deleted, cascade delete removes the notification too, so `issueProjectId` will never be null for existing notifications. No edge case handling needed.
- **[No guard on navigation target]** → If user no longer has access to the project (e.g., removed from members after notification was created), they'll hit a 404 on the issue page. This is acceptable — the issue page already handles this case.
- **[Bulk update scope safety]** → A broad update query could accidentally mark another user's notifications as read if scoping is wrong. Mitigation: strict `where user_id = event.context.userId` and no client-supplied user ID.
