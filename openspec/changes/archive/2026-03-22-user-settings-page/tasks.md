## 1. Shared Schema & Validation

- [x] 1.1 Add `updateProfileSchema` Zod schema in `shared/schemas/profile.ts` (name: string, min 1, max 50)

## 2. API Endpoints

- [x] 2.1 Create `PATCH /api/auth/profile` endpoint (`server/api/auth/profile.patch.ts`) — validate with `updateProfileSchema`, update profile name in DB, return updated profile
- [x] 2.2 Create `DELETE /api/auth/profile` endpoint (`server/api/auth/profile.delete.ts`) — check for owned projects, delete profile record, delete Supabase auth user via service role, return 200
- [x] 2.3 ~~Add `/api/auth/profile` to `authOnlyRoutes`~~ — Not needed: default middleware already requires profile, which is correct for PATCH/DELETE profile

## 3. Sidebar — Vercel-style Drill-down Navigation

- [x] 3.1 Implement sidebar drill-down in `app/layouts/default.vue`: detect `/settings` route prefix, show settings sub-menu (Profile, API Tokens) with `← Settings` back header when active, show main nav with "Settings >" chevron item otherwise
- [x] 3.2 Remove "API Tokens" item from avatar dropdown in `app/components/AppHeader.vue`

## 4. Frontend — Settings Page

- [x] 4.1 Create `/settings/index.vue` page — profile section with editable name field, read-only email, and Danger Zone section (delete account button)
- [x] 4.2 Implement name edit form: call `PATCH /api/auth/profile`, show success toast, refresh profile cache via `useProfile()`
- [x] 4.3 Implement account deletion flow: confirmation modal with "DELETE" text input, call `DELETE /api/auth/profile`, handle owned-projects error, clear session and redirect to `/login` on success

## 5. Verification

- [x] 5.1 Run `pnpm lint` and fix any lint errors
- [x] 5.2 Run `pnpm typecheck` and fix any type errors
