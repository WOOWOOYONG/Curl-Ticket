## 1. Update IssueForm.vue

- [ ] 1.1 In `onSubmit`, update the post-create `navigateTo` call to append `?type=${activeIssueType.value}` when navigating to the project list page
- [ ] 1.2 Update the "Back" `NuxtLink` (create mode only) to use `:to` binding that includes `?type=${activeIssueType}` in the href

## 2. Verification

- [ ] 2.1 Run `pnpm lint` and confirm no lint errors
- [ ] 2.2 Run `pnpm typecheck` and confirm no type errors
