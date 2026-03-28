## 1. Server API

- [x] 1.1 Create `server/api/projects/[projectId]/issues/[issueId].delete.ts` — implement DELETE endpoint using `getAccessibleProject()` and `getProjectIssue()`, with permission check (creator or project owner), execute `db.delete(issues)`, return `{ success: true }`

## 2. i18n Strings

- [x] 2.1 Add issue delete i18n keys to `i18n/locales/en.json` — `issues.deleteIssue`, `issues.deleteConfirm`, `issues.deleteSuccess`
- [x] 2.2 Add issue delete i18n keys to `i18n/locales/zh-TW.json` — matching keys in Traditional Chinese

## 3. Frontend UI

- [x] 3.1 Add delete button and confirmation modal to `app/pages/projects/[id]/issues/[issueId]/index.vue` — red UButton with trash icon below Edit button, ConfirmModal with issue ID in description, `$fetch` DELETE call, cache invalidation (`getIssuesCacheKey`, `getIssueCacheKey`), success toast, and `navigateTo` back to project

## 4. Verification

- [x] 4.1 Run `pnpm lint` and fix any issues
- [x] 4.2 Run `pnpm typecheck` and fix any type errors
