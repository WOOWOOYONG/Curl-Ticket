---
name: git-commit
description: Analyze staged and unstaged git changes, group related files, and suggest English commit messages. Use when the user says "commit", "prepare commit", "group my changes", "suggest commit message", or wants to organize uncommitted work into logical commits.
---

# Git Commit

Analyze current git changes, group related files into logical commits, and provide English commit messages. Do NOT execute any git commit commands.

## Workflow

### 1. Collect change information

Run these commands in parallel:

```bash
git status
git diff
git diff --cached
git log --oneline -5
```

### 2. Analyze and group changes

Review all changed files (staged + unstaged + untracked) and group them by logical unit of work:

- Files that serve the same purpose belong in one group (e.g. a new feature + its test)
- Config changes related to a feature go with that feature
- Independent changes (e.g. a typo fix unrelated to a feature) get their own group
- Lock files (pnpm-lock.yaml, package-lock.json) go with the package.json change that caused them

### 3. Output format

Present results as a numbered list. Each group contains:

1. **Commit message** — one-line, imperative mood, following Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`, `style:`, `ci:`, `perf:`)
2. **Files** — list of files in the group
3. **Summary** — 1-2 sentence explanation of what this group of changes does

Example output:

```
### Group 1
Message: feat: add search functionality for issues
Files:
  - server/api/projects/[projectId]/issues/index.get.ts
  - app/components/IssueSearchBar.vue
  - app/composables/useIssueSearch.ts
Summary: Add keyword search to the issue list endpoint and corresponding UI component.

### Group 2
Message: chore: update eslint config
Files:
  - eslint.config.js
Summary: Enable stylistic rules for consistent code formatting.
```

## Rules

- Use English for all commit messages
- Keep messages under 72 characters
- Use imperative mood ("add", "fix", "update", not "added", "fixes", "updated")
- Do NOT run `git add` or `git commit`
- If there are no changes, report that the working tree is clean
- Do not include files that likely contain secrets (.env, credentials, etc.) — warn the user if detected
