# Code Review Checklist

## Table of Contents
- [API Route Review](#api-route-review)
- [Vue Component Review](#vue-component-review)
- [Database & Schema Review](#database--schema-review)
- [Validation & Types Review](#validation--types-review)
- [Security Review](#security-review)
- [Error Handling Review](#error-handling-review)
- [Performance Review](#performance-review)

## API Route Review

### Authentication & Authorization
- [ ] Route is protected by `server/middleware/auth.ts` (not in `publicRoutes` unless intentional)
- [ ] `authOnlyRoutes` used only for pre-profile endpoints (invitation code redeem, auth/me)
- [ ] `event.context.profile` accessed only in fully authenticated routes (not authOnly routes)
- [ ] Admin-only routes call `requireAdmin(db, userId)`

### Project Access Control
- [ ] Project-scoped routes call `getAccessibleProject(db, projectId, userId)` before any operation
- [ ] List queries use `buildProjectAccessCondition(userId)` for filtering
- [ ] No direct project queries that bypass access control

### Request Handling
- [ ] Request body validated with Zod schema from `shared/schemas/`
- [ ] Path params validated (e.g., projectId, issueId are valid)
- [ ] `readBody(event)` used for POST/PATCH/PUT; `getQuery(event)` for GET params
- [ ] Returns appropriate HTTP status codes

## Vue Component Review

### Composition API
- [ ] Uses `<script setup lang="ts">` (not Options API)
- [ ] Uses `defineProps()`, `defineEmits()`, `defineModel()` macros
- [ ] Uses Nuxt auto-imports (no manual import of `ref`, `computed`, `useFetch`, etc.)
- [ ] Reactive state uses `ref()` or `reactive()` correctly

### Data Fetching
- [ ] Uses `useFetch` or project composables (`useProject`, `useIssues`, etc.) for SSR compatibility
- [ ] Does NOT use raw `fetch` or `axios` for API calls
- [ ] `useFetch` has proper `key` parameter for caching
- [ ] Reactive route params passed as functions: `() => \`/api/projects/${id.value}\``

### UI Components
- [ ] Uses Nuxt UI components (UButton, UCard, UInput, USelect, etc.)
- [ ] Consistent with existing design patterns in the codebase

## Database & Schema Review

### Drizzle ORM
- [ ] Schema changes in `server/database/schema/*.ts` are exported via `schema/index.ts`
- [ ] Uses Drizzle query builder (not raw SQL) unless necessary
- [ ] Joins and relations use correct foreign key references
- [ ] New tables use consistent naming (snake_case for columns, camelCase for JS)

### Migrations
- [ ] Schema changes have corresponding migration (`pnpm db:generate`)
- [ ] Migration SQL reviewed for destructive operations (DROP, ALTER column type)
- [ ] No `db:push` usage in production-bound code

## Validation & Types Review

### Zod Schemas
- [ ] New/modified API endpoints have corresponding Zod schemas in `shared/schemas/`
- [ ] Schemas shared between client and server (not duplicated)
- [ ] Uses constants from `shared/constants.ts` (e.g., `IssueStatus`, `HttpMethod`) instead of raw strings
- [ ] Schema matches database column types and constraints

### TypeScript
- [ ] No `any` types without justification
- [ ] Server route return types align with client-side type expectations
- [ ] Shared types in `shared/` or `app/types/` as appropriate

## Security Review

### Sensitive Data
- [ ] Request headers with sensitive keywords masked in UI display (`authorization`, `token`, `api-key`, `secret`, `password`, `bearer`)
- [ ] Full values stored in DB but never exposed to client-side rendering
- [ ] No secrets, API keys, or credentials in client-side code
- [ ] `.env` variables not leaked to client bundle (only `SUPABASE_URL` and `SUPABASE_KEY` are public)

### Injection Prevention
- [ ] No raw SQL concatenation — uses Drizzle ORM parameterized queries
- [ ] No `v-html` with unsanitized user input (XSS risk)
- [ ] cURL parsing via `curlconverter` library (not manual string parsing)
- [ ] User input from `readBody`/`getQuery` always validated before use

### Authorization Bypass
- [ ] Cannot access other users' data by manipulating IDs in URL
- [ ] Project access checks not skippable via direct API calls
- [ ] Profile existence check enforced for non-authOnly routes

## Error Handling Review

### Server-Side
- [ ] Uses error helpers from `server/utils/errors.ts`: `notFound()`, `forbidden()`, `badRequest()`, `unauthorized()`
- [ ] Does NOT use raw `createError()` when helpers exist
- [ ] Error messages are informative but don't leak internal details
- [ ] Database errors caught and translated to appropriate HTTP errors

### Client-Side
- [ ] API errors handled gracefully (toast, error message, not silent failures)
- [ ] Loading states shown during async operations
- [ ] Form validation errors displayed to user before submission

## Performance Review

- [ ] No N+1 queries in list endpoints (use joins or batch queries)
- [ ] `useFetch` keys are unique and stable to avoid refetch loops
- [ ] Large lists consider pagination
- [ ] No blocking operations in server middleware
- [ ] Expensive computations use `computed()` (not recalculated in template)
