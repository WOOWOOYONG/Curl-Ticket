## 1. Types & API Client

- [x] 1.1 Add comment-related types to `packages/cli/src/types.ts` (`CommentItem`, `CommentsResponse`, `CommentResponse`, `DeleteResponse`)
- [x] 1.2 Add comment API methods to `packages/cli/src/api-client.ts` (`getComments`, `getComment`, `createComment`, `updateComment`, `deleteComment`)

## 2. Formatters

- [x] 2.1 Add comment formatting functions to `packages/cli/src/formatters.ts` (human-readable output for single comment and comment list, with HTML stripping)

## 3. Command Implementations

- [x] 3.1 Create `packages/cli/src/commands/comments.ts` — list comments command
- [x] 3.2 Create `packages/cli/src/commands/get-comment.ts` — get single comment command (renamed to avoid conflict)
- [x] 3.3 Create `packages/cli/src/commands/add-comment.ts` — create comment command with content validation
- [x] 3.4 Create `packages/cli/src/commands/edit-comment.ts` — update comment command with content validation
- [x] 3.5 Create `packages/cli/src/commands/delete-comment.ts` — delete comment command with `--force` flag and JSON-mode auto-confirm

## 4. Command Registration & Schema

- [x] 4.1 Register all 5 comment commands in `packages/cli/src/index.ts` with Commander.js (args, options, withAuth wrapper, error handling)
- [x] 4.2 Update `packages/cli/src/commands/schema.ts` to include comment commands in the schema output

## 5. Documentation & Skills

- [x] 5.1 Update `packages/cli/README.md` to document comment commands (English + 繁體中文 sections)
- [x] 5.2 Update `packages/cli/skills/curl-ticket/SKILL.md` to include comment commands, usage examples, and agent workflow guidance

## 6. Verification

- [x] 6.1 Run `pnpm lint` in `packages/cli/` and fix any issues
- [x] 6.2 Run `pnpm typecheck` (or `tsc --noEmit`) in `packages/cli/` and fix any type errors
- [x] 6.3 Run `pnpm build` in `packages/cli/` to verify the CLI builds successfully
