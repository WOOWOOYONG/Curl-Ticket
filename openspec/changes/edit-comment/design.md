## Context

Issue comments currently support create and delete operations. The `issue_comments` table has `id`, `issueId`, `authorId`, `content`, and `createdAt` columns — no `updatedAt`. The delete action is already gated to the comment author via the `...` popover menu (GitHub-style). The composer now uses Nuxt UI's `UEditor` with rich text (HTML content). This change adds edit functionality using the same editor inline, following GitHub's comment editing UX pattern.

## Goals / Non-Goals

**Goals:**
- Allow comment authors to edit their own comments via an inline rich text editor
- Show an "(edited)" indicator when a comment has been modified
- Follow GitHub's UX: click "Edit" from the `...` menu → comment body becomes an editor → "Save" / "Cancel" buttons appear
- Add `updated_at` column via a proper Drizzle migration

**Non-Goals:**
- Edit history or revision tracking
- Admin editing others' comments
- Optimistic UI (refresh after save is fine)
- Real-time propagation to other users

## Decisions

### 1. Inline editor replaces comment body on edit

**Choice:** When user clicks "Edit", swap the comment body `div` with a `UEditor` pre-populated with the existing HTML content, plus "Save" / "Cancel" buttons below.
**Over:** Opening a modal/dialog for editing.

**Rationale:** GitHub uses inline editing — the comment card itself becomes the editor. This feels natural and keeps context. A modal would break flow and add unnecessary UI complexity.

### 2. Add `updated_at` column with nullable default

**Choice:** Add `updated_at` as a nullable `timestamp` column (default `null`). Only set it when a comment is actually edited.
**Over:** Using a non-null default of `created_at` or adding a boolean `is_edited` flag.

**Rationale:** `null` means "never edited" — no ambiguity. Checking `updatedAt !== null` is the simplest way to show the "(edited)" indicator. A separate boolean flag would be redundant.

### 3. PATCH route following existing DELETE pattern

**Choice:** `PATCH /api/projects/:projectId/issues/:issueId/comments/:commentId` with the same authorization pattern as the DELETE route: verify project access, verify comment exists, verify author ownership.
**Over:** PUT (full replace) or a generic comment update endpoint.

**Rationale:** PATCH is semantically correct for partial updates. The route structure mirrors the existing `[commentId].delete.ts` convention. Only `content` is updatable.

### 4. Reuse the same toolbar configuration

**Choice:** Share the same `EditorToolbarItem[][]` configuration between the composer and the inline edit editor.
**Over:** Having a different/simplified toolbar for editing.

**Rationale:** Consistency — the formatting options available when creating a comment should be the same when editing. Extracting the toolbar config to a shared constant avoids duplication.

### 5. Track editing state per comment by ID

**Choice:** Use a `ref<number | null>` (`editingId`) to track which comment is currently being edited, plus a `ref<string>` (`editContent`) for the editor's content.
**Over:** A Map of editing states or per-comment component instances.

**Rationale:** GitHub allows editing only one comment at a time. A single `editingId` ref is the simplest implementation. Starting an edit on another comment cancels the current one.

## Risks / Trade-offs

**[Migration required]** → Adding `updated_at` requires a database migration. Mitigated: the column is nullable with no default, so existing rows are unaffected. Migration is purely additive.

**[Stale content on edit]** → If another user edits the same comment concurrently, one edit will overwrite the other. → Acceptable for the current scale. No concurrent editing is expected in this tool's use case.

**[Editor initialization cost]** → Mounting a `UEditor` instance for inline editing adds overhead. → Mitigated: only one editor is mounted at a time (single `editingId`). The composer editor is already loaded, so Tiptap code is already in the bundle.

## Migration Plan

1. Generate migration: `pnpm db:generate` (adds `updated_at` column)
2. Apply migration: `pnpm db:migrate`
3. Deploy — the nullable column means no data backfill needed
4. Rollback: drop the `updated_at` column if needed (no data loss)
