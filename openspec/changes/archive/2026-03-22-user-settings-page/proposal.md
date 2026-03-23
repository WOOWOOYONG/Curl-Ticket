## Why

The app currently has no dedicated settings page — user operations are limited to the avatar dropdown menu (AUTH-024). As more user-facing settings accumulate (API tokens, profile info), a centralized settings page improves discoverability and provides room for account management features like name editing and account deletion.

## What Changes

- Add a **Settings** link to the sidebar navigation, routing to `/settings`
- Create a **User Settings page** (`/settings/index.vue`) with:
  - View and edit user display name
  - Link/section for API Tokens management (moved from avatar dropdown)
  - Account deletion (self-service, with confirmation)
- Remove the "API Tokens" link from the avatar dropdown menu (replaced by settings page navigation)
- Add `PATCH /api/auth/profile` endpoint for updating user name
- Add `DELETE /api/auth/profile` endpoint for account deletion (cascading cleanup)

### Non-goals

- Changing email or OAuth provider (managed by Supabase)
- Admin user management (editing other users' profiles)
- Avatar/photo upload (uses Google OAuth avatar)
- Role changes (admin-only via SQL)

## Capabilities

### New Capabilities

- `user-settings`: Settings page with profile editing (name), API tokens navigation, and account deletion

### Modified Capabilities

_None — existing API tokens page and functionality remain unchanged; only the navigation path to reach it changes._

## Impact

- **Pages**: New `/settings/index.vue`; existing `/settings/tokens.vue` unchanged
- **Components**: `AppHeader.vue` (remove API Tokens dropdown item), `default.vue` layout (add Settings nav item)
- **API**: New `PATCH /api/auth/profile`, new `DELETE /api/auth/profile`
- **Database**: No schema changes (profiles table already has `name` column)
- **PRD**: `AUTH-024` will be superseded — settings now live on a dedicated page

