# CLI Manual Testing Guide

This guide documents the standard local testing flow for `@curl-ticket/cli`.

## Scope

Use this guide when you need to:

- verify CLI behavior during local development
- test interactive prompts
- test real API calls against a non-production project
- verify global install or link behavior before release

## Rules

- Prefer a dedicated test project such as `FTT / Test Project`.
- Do not test destructive flows against production projects.
- Treat pasted cURL commands as sensitive input. Avoid sharing bearer tokens in logs or screenshots.
- During development, test `dist/index.js` directly instead of `ct` unless you are explicitly testing the global install experience.

## Standard Development Loop

Run the build watcher in one terminal:

```bash
cd /Users/wenkmedia/Desktop/Curl-Ticket/packages/cli
pnpm dev
```

This keeps `dist/index.js` up to date after every source edit.

Use another terminal to run the compiled CLI:

```bash
cd /Users/wenkmedia/Desktop/Curl-Ticket/packages/cli
node dist/index.js projects
node dist/index.js project <projectId>
node dist/index.js create-issue <projectId>
```

## Why Test `dist/index.js`

The CLI `bin` entry points to `dist/index.js`, not `src/index.ts`.

```json
"bin": {
  "ct": "./dist/index.js",
  "curl-ticket": "./dist/index.js"
}
```

If you change files under `src/` but do not rebuild, a global `ct` command can still run stale code.

## Pre-Commit Verification

Before committing or preparing a release, run:

```bash
cd /Users/wenkmedia/Desktop/Curl-Ticket/packages/cli
pnpm typecheck
pnpm build

cd /Users/wenkmedia/Desktop/Curl-Ticket
pnpm test:run -- packages/cli/src/__tests__/utils.test.ts packages/cli/src/__tests__/commands-create-issue.test.ts
```

If you changed other CLI areas, expand the test selection accordingly.

## Core Manual Test Cases

### Authentication and Connectivity

```bash
cd /Users/wenkmedia/Desktop/Curl-Ticket/packages/cli
node dist/index.js projects
```

Verify:

- the CLI can read local auth config or environment variables
- the target instance is reachable
- project listing succeeds

### Create Task Issue

Non-interactive:

```bash
node dist/index.js create-issue <projectId> --type task --title '0410 Create Test'
```

Interactive:

```bash
node dist/index.js create-issue <projectId>
```

Then select:

```text
1) API Bug
2) Task
```

Verify:

- task creation succeeds
- the returned issue title matches the provided title

### Create API Bug from cURL

Interactive:

```bash
node dist/index.js create-issue <projectId>
```

Then select `API Bug` and paste a full multi-line cURL command in one shot.

Example:

```bash
curl 'https://example.com/api/test' \
-H 'accept: application/json' \
--data-raw '{"ok":true}'
```

Verify:

- the pasted multi-line cURL is accepted without line-by-line manual confirmation
- the parser succeeds
- the created issue title is auto-generated from HTTP method and URL path
- headers and request body are preserved

### JSON Mode

```bash
node dist/index.js projects --json
node dist/index.js issue <projectId> <issueId> --json
```

Verify:

- valid JSON is returned
- errors also render as JSON when `--json` is present

### Error Handling

Verify at least one case from each category:

- invalid `projectId`
- invalid status
- missing required option in non-interactive mode
- unauthorized or expired token
- network failure

## Global Install or Link Verification

Only do this when you specifically need to test the end-user install experience.

### Link Local Workspace Globally

```bash
cd /Users/wenkmedia/Desktop/Curl-Ticket/packages/cli
pnpm link --global
```

Check what your shell resolves:

```bash
which ct
which curl-ticket
```

If needed, inspect the shim to confirm it points to this workspace:

```bash
sed -n '1,80p' ~/Library/pnpm/ct
```

### Important Caveat

Even with a global link, the executed entry is still `dist/index.js`. Keep `pnpm dev` running or rebuild manually after source changes:

```bash
cd /Users/wenkmedia/Desktop/Curl-Ticket/packages/cli
pnpm build
```

### Clean Up Global Test Install

When you are done testing, remove the global package:

```bash
pnpm remove --global @curl-ticket/cli
```

Then confirm cleanup:

```bash
which ct
which curl-ticket
```

Expected result:

- `ct not found`
- `curl-ticket not found`

## Suggested Test Project Workflow

Recommended sequence for interactive verification:

1. List projects and choose a safe test project.
2. Create one `task` issue.
3. Create one `api_bug` issue from a multi-line cURL.
4. Inspect the created issue details.
5. Delete test issues if they are no longer needed.

## Troubleshooting

### CLI runs old behavior

Cause:

- `dist/index.js` is stale
- global `ct` still points to a local workspace build

Fix:

```bash
cd /Users/wenkmedia/Desktop/Curl-Ticket/packages/cli
pnpm build
```

Then rerun with:

```bash
node dist/index.js ...
```

### `unlink` says nothing to unlink

Cause:

- the CLI was installed globally rather than linked in a way `pnpm unlink --global` recognizes

Fix:

```bash
pnpm remove --global @curl-ticket/cli
```

### Interactive create-issue cannot parse pasted cURL

Check:

- you are running the latest `dist/index.js`
- the pasted command is a valid shell cURL
- the target API parser is reachable

## Short Version

For most local feature work:

```bash
cd /Users/wenkmedia/Desktop/Curl-Ticket/packages/cli
pnpm dev
```

In another terminal:

```bash
cd /Users/wenkmedia/Desktop/Curl-Ticket/packages/cli
node dist/index.js create-issue <projectId>
```

Only use global install or link when you are explicitly testing install behavior.
