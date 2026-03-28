## Context

The project list page (`/projects/[id]`) already supports reading the active issue-type tab from a `?type=` query parameter and syncing it back on tab change. The create form also reads `?type=` on entry to pre-select the tab. However, the post-create navigation and the "Back" link in create mode both omit `?type=`, so the list page always resets to its default tab (API Bug) regardless of what the user was creating.

The fix is a two-line change confined to `IssueForm.vue`.

## Goals / Non-Goals

**Goals:**
- After a successful issue creation, land on the project list page with the tab matching the type that was just created.
- The "Back" link in create mode also preserves the selected type so navigating back does not reset the tab.

**Non-Goals:**
- Changing edit-mode navigation (edit navigates to the issue detail page, not the list).
- Persisting tab state across sessions (query param is sufficient).
- Touching the list page — it already handles `?type=` correctly.

## Decisions

**Query param over client-side state (Pinia/composable)**

The list page already uses `route.query.type` as the source of truth for the active tab, so passing the type via query param is consistent with the existing pattern and requires no new state management infrastructure.

**Scope: `IssueForm.vue` only**

Both the post-create `navigateTo` call and the back-link `NuxtLink` live in this single file. No changes are needed to the create page, the list page, or any API.

## Risks / Trade-offs

- **No known risks.** The query param is already validated on the list page (`route.query.type === IssueType.Task ? IssueType.Task : IssueType.ApiBug`), so an unexpected value safely falls back to the default.
