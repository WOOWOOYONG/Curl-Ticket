## 1. Update IssueForm.vue

- [x] 1.1 In `onSubmit`, update the post-create `navigateTo` call to append `?type=${activeIssueType.value}` when navigating to the project list page
- [x] 1.2 Update the "Back" `NuxtLink` (create mode only) to use `:to` binding that includes `?type=${activeIssueType}` in the href

## 2. Verification

- [x] 2.1 Run `pnpm lint` and confirm no lint errors
- [x] 2.2 Run `pnpm typecheck` and confirm no type errors
