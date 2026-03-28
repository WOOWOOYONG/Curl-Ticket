## Why

When a user creates an issue, the issue form supports two types — API Bug and Task — selected via a tab. After the form is submitted successfully, navigation returns to the project list page, but the active tab always resets to the default (API Bug), losing the user's context. This creates unnecessary friction when creating multiple issues of the same type.

## What Changes

- After creating an issue, the navigation back to the project list page includes `?type=<issueType>` as a query parameter, so the correct tab is pre-selected.
- The "Back" link on the create form also preserves the `type` query parameter so that navigating back before submitting also restores the correct tab.

## Capabilities

### New Capabilities

_(none — this is a behaviour fix to an existing flow)_

### Modified Capabilities

- `issue-create`: The post-create navigation and back-link now carry the `?type=` query param to preserve the active issue-type tab on the list page.

## Impact

- `app/components/IssueForm.vue`: update `navigateTo` (post-create) and the back `NuxtLink` (create mode) to append `?type=${activeIssueType.value}`.
- No API, schema, or database changes required.
- No breaking changes.
