---
name: cli-publish
description: Detect CLI package changes and publish to npm. Use when asked to "publish cli", "release cli", "cli 發布", "cli 有變更嗎", or "check cli changes".
---

# CLI Publish Skill

Detect changes in `packages/cli/` since the last release and guide publishing to npm.

## Strategy

Use **Git tag comparison** with `cli-v*` tags to track releases. Each publish creates a `cli-v<version>` tag.

## Workflow

### Step 1: Detect Changes

1. Find the latest `cli-v*` tag:
   ```bash
   git tag -l 'cli-v*' --sort=-v:refname | head -1
   ```
2. If no tag exists, treat as first release — all files in `packages/cli/` are changes.
3. Compare tag to HEAD:
   ```bash
   git diff <tag>..HEAD -- packages/cli/
   ```
4. If no changes found, inform the user that no publish is needed and stop.

### Step 2: Show Changes

Display the changed files and related commits:

```bash
git diff --stat <tag>..HEAD -- packages/cli/
git log <tag>..HEAD --oneline -- packages/cli/
```

### Step 3: Determine Version

1. Read current version from `packages/cli/package.json`.
2. Analyze changes and suggest a semver bump:
   - **patch**: bug fixes, docs, minor tweaks
   - **minor**: new features, non-breaking additions
   - **major**: breaking changes
3. Ask the user to confirm the version number before proceeding.

### Step 4: Publish

Execute the following steps in order. Stop and report if any step fails.

1. Bump version (without creating a git tag):
   ```bash
   cd packages/cli && npm version <patch|minor|major> --no-git-tag-version
   ```
2. Build and type-check:
   ```bash
   pnpm build && pnpm typecheck
   ```
3. Publish to npm:
   ```bash
   npm publish --access public
   ```
4. Commit, tag, and push:
   ```bash
   git add packages/cli/package.json pnpm-lock.yaml
   git commit -m "chore: release @curl-ticket/cli v<version>"
   git tag cli-v<version>
   git push origin main --tags
   ```

## Important Notes

- Always confirm with the user before running `npm publish` and `git push`.
- If build or typecheck fails, fix issues before publishing.
- The tag format is `cli-v<version>` (e.g., `cli-v0.2.0`).
