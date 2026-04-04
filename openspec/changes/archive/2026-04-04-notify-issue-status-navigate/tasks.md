## 1. Issue Status Change Notification (Server)

- [x] 1.1 Extend existing issue SELECT in `[issueId].patch.ts` to also fetch `status`, `createdBy`, `projectKey`, `issueNumber`
- [x] 1.2 After update, compare `existing.status` vs `result.data.status` — if changed and updater !== `createdBy`, INSERT notification with type `issue_update`, title `Issue {KEY-NUM} status updated`, content `{oldStatus} → {newStatus}`

## 2. Notifications API: Return projectId via JOIN (Server)

- [x] 2.1 In `notifications/index.get.ts`, add LEFT JOIN on `issues` table via `notifications.issueId` and include `issues.projectId` as `issueProjectId` in the select

## 3. Notification Click Navigation (Frontend)

- [x] 3.1 Update `NotificationBell.vue` click handler: for `issue_update` and `issue_comment` types with `issueProjectId` and `issueId`, call `markAsRead` (if unread), close popover, then `navigateTo(/projects/:projectId/issues/:issueId)`
- [x] 3.2 Guard against missing `issueProjectId`: if null, mark as read but skip navigation

## 4. Verification

- [x] 4.1 Run `pnpm lint` and `pnpm typecheck` to verify no regressions

## 5. Mark All Notifications As Read

- [x] 5.1 Add `PATCH /api/notifications/read-all` endpoint to update unread notifications for current user and return `updatedCount`
- [x] 5.2 Extend `useNotifications` with `markAllAsRead()` and refresh notification data after success
- [x] 5.3 Add NotificationBell header action button to trigger bulk read with loading and disabled states
- [x] 5.4 Add i18n key `notifications.markAllAsRead` in `i18n/locales/en.json` and `i18n/locales/zh-TW.json`
- [x] 5.5 Re-run `pnpm lint` and `pnpm typecheck` after bulk-read changes
