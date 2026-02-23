# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Curl Ticket is an API issue tracking app built with Nuxt 4. It helps engineering teams reproduce backend problems by converting pasted cURL commands into structured issue records with request/response tracking.

## Commands

### Development
```bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm lint             # Run ESLint
pnpm typecheck        # Run Nuxt/Vue type checks
```

### Database (Drizzle ORM)
```bash
pnpm db:generate      # Generate migration from schema changes (after editing server/database/schema/*.ts)
pnpm db:migrate       # Apply pending migrations to database
pnpm db:push          # Push schema directly to DB (use for quick iteration, bypasses migrations)
pnpm db:studio        # Open Drizzle Studio GUI
pnpm db:types         # Generate Supabase TypeScript types (uses hardcoded project ID in package.json)
```

### Local Scripts
```bash
node scripts/verify-schema.mjs    # Print current database schema from information_schema
node scripts/reset-db.mjs         # Drop all app tables and migration history (destructive!)
```

## Architecture

### Tech Stack
- **Frontend:** Nuxt 4, Vue 3 (Composition API with `<script setup>`), TypeScript, Nuxt UI, Tailwind CSS, VueUse
- **Backend:** Nuxt server routes, Supabase Auth (Google OAuth), PostgreSQL, Drizzle ORM
- **Validation:** Zod schemas (shared between client/server in `shared/schemas/`)
- **Parsing:** `curlconverter` for cURL command parsing
- **Highlighting:** Shiki for JSON syntax highlighting

### Directory Structure
```
app/                        # Nuxt app directory
  pages/                    # File-based routing
  components/               # Vue components
  composables/              # Reusable composition functions
  layouts/                  # Layout components
  types/                    # Client-side TypeScript types
server/
  api/                      # API route handlers (/api/*)
  middleware/               # Server middleware (auth.ts runs on all /api/* routes)
  database/
    schema/                 # Drizzle table definitions (profiles, projects, issues, etc.)
    migrations/             # SQL migration files
  utils/                    # Server utilities (db.ts, profile.ts, project-access.ts, errors.ts)
  constants/                # Server-side constants
shared/                     # Code shared between client and server
  schemas/                  # Zod validation schemas (issue, project, invitation-code, etc.)
  constants.ts              # Shared constants (IssueStatus, HttpMethod, UserRole, etc.)
docs/                       # Product documentation
scripts/                    # Local utility scripts
```

### Authentication & Authorization Flow

**Two-phase system:** OAuth + Invitation Code registration

1. **OAuth Phase:** User logs in with Google OAuth via Supabase Auth. User gets a Supabase session but NO profile record yet.
2. **Registration Phase:** User must redeem a 6-character invitation code to create a profile record in the `profiles` table. Without a profile, users can only access `authOnlyRoutes`.

**Server Middleware (`server/middleware/auth.ts`):**
- Runs on all `/api/*` routes except public routes (`/api/health`, `/api/invitation-codes/validate`)
- Checks Supabase session via `serverSupabaseClient(event).auth.getUser()`
- Sets `event.context.userId`, `event.context.userEmail`, `event.context.userMetadata`
- For `authOnlyRoutes` (`/api/invitation-codes/redeem`, `/api/auth/me`): allows access without profile
- For all other routes: requires profile record via `getProfile()`, throws 403 if missing
- Sets `event.context.profile` for authenticated routes

**Profile System:**
- `profiles` table: `id` (matches Supabase auth.users.id), `email`, `name`, `role` ('admin' | 'user')
- Profile is NOT auto-created on OAuth login
- Profile is created only when user redeems a valid invitation code via `/api/invitation-codes/redeem`
- Use `getProfile(db, userId)` to fetch profile (returns null if not exists)
- Use `getOrCreateProfile(db, userId, email, name?)` only in invitation code redemption flow
- Use `requireAdmin(db, userId)` to enforce admin-only routes

### Project Access Control

Projects have an `ownerId` and a many-to-many `project_members` relationship.

**Access Rule:** User can access a project if:
- User is the project owner (`projects.ownerId === userId`), OR
- User exists in `project_members` for that project

**Key Utilities (`server/utils/project-access.ts`):**
- `buildProjectAccessCondition(userId)`: Returns Drizzle SQL condition for project visibility
- `getAccessibleProject(db, projectId, userId)`: Fetches project if user has access, throws 404 if not

**Pattern:** Always use `getAccessibleProject()` in project-scoped API routes before performing operations.

### Database Schema (Drizzle ORM)

**Key Tables:**
- `profiles`: User profiles (id matches Supabase auth.users.id)
- `projects`: Projects with `owner_id`, `name`, `key` (short project code)
- `issues`: Issue records with `project_id`, `issue_number`, `raw_curl`, `method`, `url`, `request_headers`, `request_body`, `response_status`, `response_body`, `status`, `environment`
- `project_members`: Join table for project membership (project_id, user_id)
- `invitation_codes`: 6-character codes with `code`, `max_uses`, `used_count`, `expires_at`, `created_by`
- `project_invitations`: Project-specific invitations (project_id, invited_user_id, invited_by, status: 'pending' | 'accepted' | 'rejected' | 'expired')
- `notifications`: Notification records (user_id, type, data, read_at)

**Drizzle Setup:**
- Schema definitions: `server/database/schema/`
- Export all tables via `server/database/schema/index.ts`
- DB connection: `server/utils/db.ts` exports `useDB()` (lazy singleton pattern)
- Migrations stored in `server/database/migrations/`
- Config: `drizzle.config.ts` points to schema, uses `DATABASE_URL` env var

### Shared Validation (Zod)

All API request/response validation uses Zod schemas defined in `shared/schemas/`:
- `issue.ts`: `createIssueSchema`, `updateIssueSchema`, `issueSchema`
- `project.ts`: `createProjectSchema`, `updateProjectSchema`, `projectSchema`
- `invitation-code.ts`: `createInvitationCodeSchema`, `redeemInvitationCodeSchema`
- `project-invitation.ts`: `createProjectInvitationSchema`, `respondToInvitationSchema`

**Pattern:** Import schemas in both server API routes and client composables to ensure type safety and validation consistency.

### Constants & Enums

**Shared constants** (`shared/constants.ts`):
- `IssueStatus`: 'Open' | 'In Progress' | 'Done' | 'Close'
- `Environment`: 'Local' | 'Dev' | 'Staging' | 'Prod'
- `HttpMethod`: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
- `UserRole`: 'admin' | 'user'
- `InvitationStatus`: 'pending' | 'accepted' | 'rejected' | 'expired'
- `NotificationType`: 'issue_update' | 'project_invite'

Use the constant objects (e.g., `IssueStatus.Open`) instead of raw strings.

### Composables Pattern

**Data Fetching:** Use Nuxt's `useFetch` with reactive keys for server-side rendering (SSR) support.

Example:
```typescript
// app/composables/useProject.ts
export function useProject(projectId: Ref<string> | ComputedRef<string>) {
  return useFetch<ProjectResponse>(() => `/api/projects/${projectId.value}`, {
    key: `project-${projectId.value}`
  })
}
```

**Other composables:**
- `useIssues(projectId)`: Fetch issues for a project
- `useShikiHighlighter()`: JSON syntax highlighting
- `useCopy()`: Copy to clipboard utility
- `useNotifications()`: Fetch user notifications
- `useProfile()`: Fetch current user profile

### API Routes

All routes are protected by `server/middleware/auth.ts` unless explicitly in `publicRoutes`.

**Key endpoints:**
- `POST /api/curl/parse` - Parse cURL command
- `GET /api/projects` - List user's accessible projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:projectId` - Get project details
- `GET /api/projects/:projectId/issues` - List project issues
- `POST /api/projects/:projectId/issues` - Create issue
- `GET /api/projects/:projectId/issues/:issueId` - Get issue details
- `PATCH /api/projects/:projectId/issues/:issueId` - Update issue
- `GET /api/projects/:projectId/members` - List project members
- `POST /api/projects/:projectId/invitations` - Create project invitation
- `POST /api/invitation-codes` - Create invitation code (admin only)
- `POST /api/invitation-codes/redeem` - Redeem invitation code (authOnly, creates profile)
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:notificationId/read` - Mark notification as read

### Error Handling

**Server utilities** (`server/utils/errors.ts`):
- `notFound(message)`: Throws 404 error
- `forbidden(message)`: Throws 403 error
- `badRequest(message)`: Throws 400 error
- `unauthorized(message)`: Throws 401 error

Use these helpers instead of manually calling `createError()`.

### Sensitive Data Masking

**Security pattern:** Request headers containing sensitive keywords are masked in the UI:
- Keywords: `authorization`, `token`, `api-key`, `secret`, `password`, `bearer`
- Display value: `***REDACTED***`
- Storage: Full values are stored in DB but masked on display in client components

**Implementation:** Check `app/components/IssueForm.vue` and issue detail pages for masking logic.

### Database Migration Workflow

1. Edit schema files in `server/database/schema/*.ts`
2. Run `pnpm db:generate` to create migration SQL file
3. Review generated SQL in `server/database/migrations/`
4. Run `pnpm db:migrate` to apply migration
5. (Optional) Run `pnpm db:types` to regenerate Supabase types if using Supabase client types

**Note:** `pnpm db:push` bypasses migrations and directly syncs schema to DB. Use only during rapid development.

### Environment Variables

Required in `.env`:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public key
- `DATABASE_URL` - PostgreSQL connection string (Supabase or external)

### Testing & CI

**Current CI:** GitHub Actions workflow runs `pnpm install`, `pnpm lint`, `pnpm typecheck` on all pushes.

**No test suite yet.** When writing tests:
- Use Vitest for unit tests
- Use Vue Test Utils + Vitest for component tests
- Consider Playwright for E2E tests

### Vue/Nuxt Best Practices

- **Always use Composition API with `<script setup>`** (not Options API)
- Use TypeScript for all new files
- Prefer `defineProps()`, `defineEmits()`, `defineModel()` macros over manual `props` object
- Use `useFetch` for SSR-compatible data fetching (not `fetch` or `axios`)
- Use Nuxt auto-imports (no need to import `ref`, `computed`, `useFetch`, etc.)
- Use Nuxt UI components for consistent design (UButton, UCard, UInput, USelect, etc.)

### Code Style

- ESLint config: `@nuxt/eslint` with stylistic rules (commaDangle: 'never', braceStyle: '1tbs')
- Run `pnpm lint` before committing
- Use 2-space indentation
- Use single quotes for strings
- Prefer template literals for string interpolation
