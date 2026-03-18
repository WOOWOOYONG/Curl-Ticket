---
name: pr-description
description: Generate a PR description following the project's pull_request_template.md. Use when the user says "create PR", "open PR", "PR description", "generate PR body", "建立 PR", or wants to create a pull request with a structured description.
---

# PR Description

Generate a PR description that follows the project template at `.github/pull_request_template.md`.

## Workflow

### 1. Collect change information

Run these commands in parallel:

```bash
git log --oneline main..HEAD
git diff main...HEAD --stat
git diff main...HEAD
```

### 2. Read the PR template

Read `.github/pull_request_template.md` to get the current template structure.

### 3. Generate the PR description

Fill in each section of the template:

- **Summary**: Analyze all commits and diffs, write 1-3 bullet points describing what the PR does. Focus on the "why", not the "what".
- **Type of Change**: Check the single most appropriate type based on the changes. If multiple types apply, check the primary one.
- **Related Issues**: Reference any issue numbers found in commit messages or branch names. Leave empty if none.
- **Test Plan**: Check the boxes that apply based on what was actually tested or is relevant.
- **Screenshots**: Remove this section entirely unless the PR includes UI changes.

### 4. Create the PR

Use `gh pr create` with the generated description:

```bash
gh pr create --title "<conventional commit style title>" --body "$(cat <<'EOF'
<generated PR body>
EOF
)"
```

## Rules

- Always read the template file first — do not hardcode the template structure
- Keep the summary concise and meaningful
- Use imperative mood in the PR title (e.g., "add", "fix", "update")
- PR title should follow Conventional Commits format and stay under 72 characters
- Analyze ALL commits in the branch, not just the latest one
- Push the branch to remote before creating the PR if not already pushed
