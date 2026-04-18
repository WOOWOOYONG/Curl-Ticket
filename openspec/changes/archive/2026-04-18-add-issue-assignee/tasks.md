## 1. Schema & Migration

- [x] 1.1 Add `assigneeId` column to `server/database/schema/issues.ts` (nullable `uuid`, FK to `profiles.id` with `onDelete: 'set null'`) plus an `issues_assignee_idx` index on `assignee_id`
- [x] 1.2 Run `pnpm db:generate`, review the generated SQL in `server/database/migrations/`, and commit it
- [x] 1.3 Apply the migration locally with `pnpm db:migrate` and confirm with `node scripts/verify-schema.mjs`

## 2. Shared Validation

- [x] 2.1 Extend `issueBaseFields` in `shared/schemas/issue.ts` to include `assigneeId: z.uuid().nullish()`
- [x] 2.2 Extend `issueBaseUpdateFields` so `updateIssueSchema` accepts `assigneeId` (nullable uuid)
- [x] 2.3 Extend `issueSchema` (and `issueListItemSchema` if the list should render the assignee) to include `assigneeId` and a nested `assignee: { id, name, email } | null`

## 3. Server Utilities

- [x] 3.1 Add `assertAssigneeAllowed(db, projectId, assigneeId)` helper in `server/utils/project-access.ts` (or new `server/utils/issue-assignee.ts`): no-op when `assigneeId` is null; otherwise verify id matches `projects.ownerId` or exists in `project_members`; throws `badRequest` otherwise
- [x] 3.2 Add a `selectAssigneeSummary` helper that returns a Drizzle selection joining `profiles` with `isNull(profiles.deletedAt)` so issue responses can include `assignee: { id, name, email } | null`

## 4. Issue API — Create & Update

- [x] 4.1 `POST /api/projects/:projectId/issues` (`server/api/projects/[projectId]/issues/index.post.ts`): accept `assigneeId`, call `assertAssigneeAllowed`, persist the column; if the resulting assignee is non-null and differs from the acting user, insert an `issue_update` notification inside the same transaction with title `Issue <key>-<number> assigned to you` and content = issue title
- [x] 4.2 `PATCH /api/projects/:projectId/issues/:issueId` (`server/api/projects/[projectId]/issues/[issueId].patch.ts`): select the existing `assigneeId` in the row-lock query, call `assertAssigneeAllowed` when the field is present, and after the update write an `issue_update` notification when the new assignee is non-null, differs from the previous value, and is not the acting user — all within the existing transaction
- [x] 4.3 Update the GET issue endpoint and the issue list endpoint to include the resolved `assignee` object via LEFT JOIN on `profiles`, filtered by `isNull(profiles.deletedAt)`

## 5. Client — Composables & Components

- [x] 5.1 Add (or reuse) `app/composables/useProjectMembers.ts` using `useFetch` keyed by `projectId`, exposing members for the assignee dropdown
- [x] 5.2 Update `app/components/IssueForm.vue` to render an "Assignee" `USelect` with an "Unassigned" option + members from `useProjectMembers`; wire it through `defineModel`/`v-model` so create and edit flows share the control
- [x] 5.3 Render assignee on the issue detail page (`app/pages/projects/[projectId]/issues/[issueId].vue` or equivalent) and in the issue list component; show "Unassigned" label when `assignee` is null
- [x] 5.4 Add i18n strings for "Assignee" and "Unassigned" in both `en` and `zh-TW` locale files (aligning with `i18n-ui-strings`)

## 6. Docs

- [x] 6.1 Update `docs/prd/issues.md`: add an `ISSUE-*` requirement describing the assignee field, assign-anyone rule, and notification trigger

## 7. Verification

- [x] 7.1 Manually exercise: create issue with/without assignee, reassign, unassign, self-assign — verify bell firing matches the spec scenarios
- [x] 7.2 Run `pnpm format:check`, `pnpm lint`, and `pnpm typecheck` — all pass
