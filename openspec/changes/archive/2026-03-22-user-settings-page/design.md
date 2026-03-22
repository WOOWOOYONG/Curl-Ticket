## Context

The app currently centralizes user actions in an avatar dropdown (theme toggle, API tokens link, logout). As the feature set grows, a dedicated settings page provides a scalable home for user-facing configuration. The existing `/settings/tokens.vue` page already lives under the settings route — this change adds an index page and integrates it into sidebar navigation.

The profiles table already stores `name` (nullable varchar), so name editing requires no schema migration. Account deletion requires cascading cleanup across multiple tables.

## Goals / Non-Goals

**Goals:**
- Provide a centralized settings page accessible from sidebar navigation
- Allow users to edit their display name
- Allow users to delete their own account with proper confirmation
- Consolidate settings navigation (move API tokens link from dropdown to settings page)

**Non-Goals:**
- Email or OAuth provider changes (managed by Supabase)
- Avatar upload (uses Google OAuth avatar)
- Admin user management
- Role self-service changes

## Decisions

### 1. Settings page structure: separate pages with sidebar drill-down

**Decision:** Settings uses separate pages under `/settings/` (profile at `/settings`, tokens at `/settings/tokens`). The sidebar implements a Vercel-style drill-down pattern: clicking "Settings" in the main sidebar replaces the nav items with settings sub-menu items (Profile, API Tokens), with a back button to return to the main navigation.

**Implementation:** The sidebar in `default.vue` detects when the current route starts with `/settings` and switches to a settings-specific nav list. A `← Back` button at the top navigates back to `/` and restores the main nav. This is purely route-driven — no extra state management needed.

**Rationale:** Follows the Vercel dashboard pattern the user requested. Keeps the sidebar contextual and focused. Each settings section gets its own page for clean separation. The route-based approach (`route.path.startsWith('/settings')`) is simple and SSR-compatible.

### 2. Profile update API: new dedicated endpoint vs. extending `/api/auth/me`

**Decision:** New `PATCH /api/auth/profile` endpoint with Zod validation.

**Rationale:** Follows REST conventions — GET `/auth/me` reads, PATCH `/auth/profile` writes. Keeps the read endpoint simple. The profile endpoint is an `authOnlyRoute` since it modifies the profile directly.

### 3. Account deletion: soft delete vs. hard delete

**Decision:** Hard delete with cascading cleanup. Delete the profile record and let Supabase Auth admin API delete the auth user. Owned projects transfer or block deletion if the user owns projects.

**Rationale:** Soft delete adds complexity (filtering deleted users everywhere) for minimal benefit in this app's scale. Hard delete is simpler and respects user data removal expectations.

**Alternatives considered:**
- Soft delete with `deletedAt` column: More reversible but leaks complexity across all queries
- Hard delete without auth cleanup: Would leave orphaned Supabase auth records

### 4. Account deletion guard: block if user owns projects

**Decision:** If the user owns any projects, the API returns 400 with a message to transfer or delete projects first. This prevents orphaned projects.

**Rationale:** Cascading project deletion is too destructive and surprising. Requiring explicit project cleanup before account deletion is safer and gives the user control.

### 5. Sidebar navigation: Vercel-style drill-down

**Decision:** The main sidebar shows a "Settings" item with a `>` chevron (no direct route). Clicking it transitions the sidebar to show settings sub-items (Profile, API Tokens) with a `← Settings` back header. The transition is driven by route detection (`/settings/*`).

**Rationale:** Mirrors Vercel's dashboard sidebar UX — keeps the main nav clean while giving settings their own contextual space. The chevron signals "drill-down" rather than "navigate to page".

## Risks / Trade-offs

- **[Risk] Account deletion is irreversible** → Require typed confirmation (e.g., type "DELETE") plus a modal confirmation dialog before proceeding
- **[Risk] Supabase auth user deletion requires service role key** → Use `serverSupabaseServiceRole` on the server side; never expose service role key to client
- **[Risk] Name update could be used for abuse** → Basic length validation (1-50 chars) via Zod schema; no profanity filter needed at this scale

## Open Questions

- Should the settings page show the user's email (read-only) for reference? (Leaning yes — helpful context)
