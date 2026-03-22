## ADDED Requirements

### Requirement: Sidebar drill-down navigation for Settings
The sidebar SHALL implement a Vercel-style drill-down pattern. The main sidebar SHALL display a "Settings" item with a chevron icon (`>`). Clicking it SHALL navigate to `/settings` and replace the sidebar content with settings sub-menu items. A back button SHALL return to the main navigation.

#### Scenario: Authenticated user sees Settings in main sidebar
- **WHEN** an authenticated user views a non-settings page (e.g., `/`, `/projects/*`)
- **THEN** the sidebar SHALL display a "Settings" item with a `>` chevron at the bottom of the nav list

#### Scenario: Clicking Settings drills into settings sub-menu
- **WHEN** user clicks the "Settings" sidebar item
- **THEN** the app SHALL navigate to `/settings` AND the sidebar SHALL replace main nav items with settings sub-items: "Profile" (`/settings`) and "API Tokens" (`/settings/tokens`), with a `← Settings` back header at the top

#### Scenario: Back button returns to main navigation
- **WHEN** user clicks the `←` back button in the settings sidebar
- **THEN** the app SHALL navigate to `/` AND the sidebar SHALL restore the main navigation items (Projects, Invitations, Settings)

#### Scenario: Settings sidebar persists across settings pages
- **WHEN** user navigates between `/settings` and `/settings/tokens`
- **THEN** the sidebar SHALL continue showing the settings sub-menu with the current page highlighted as active

### Requirement: Settings page displays user profile
The settings page (`/settings`) SHALL display the current user's profile information including their display name and email address (read-only).

#### Scenario: User views settings page
- **WHEN** user navigates to `/settings`
- **THEN** the page SHALL display the user's current display name in an editable field and their email address as read-only text

### Requirement: User can edit display name
The system SHALL allow users to update their display name via the settings page. The name MUST be between 1 and 50 characters.

#### Scenario: Successful name update
- **WHEN** user enters a valid name (1-50 characters) and submits the form
- **THEN** the system SHALL update the profile name via `PATCH /api/auth/profile` and display a success toast notification

#### Scenario: Invalid name rejected
- **WHEN** user submits an empty name or a name exceeding 50 characters
- **THEN** the system SHALL display a validation error and NOT submit the request

#### Scenario: Name update reflected in UI
- **WHEN** user successfully updates their name
- **THEN** the updated name SHALL be reflected in the header avatar dropdown and sidebar without page reload

### Requirement: API Tokens accessible from settings sidebar
The settings sidebar sub-menu SHALL include an "API Tokens" link that navigates to `/settings/tokens`.

#### Scenario: User navigates to API Tokens from settings sidebar
- **WHEN** user clicks "API Tokens" in the settings sidebar sub-menu
- **THEN** the app SHALL navigate to `/settings/tokens` with "API Tokens" highlighted as active in the sidebar

### Requirement: API Tokens link removed from avatar dropdown
The avatar dropdown menu SHALL no longer contain the "API Tokens" navigation item. Theme toggle and logout SHALL remain.

#### Scenario: Avatar dropdown without API Tokens
- **WHEN** user opens the avatar dropdown menu
- **THEN** the dropdown SHALL show theme toggle and logout options but SHALL NOT show an "API Tokens" link

### Requirement: User can delete own account
The system SHALL allow users to delete their own account via the settings page. Account deletion MUST require explicit confirmation.

#### Scenario: User initiates account deletion
- **WHEN** user clicks "Delete Account" in the danger zone section
- **THEN** the system SHALL display a confirmation modal requiring the user to type "DELETE" to proceed

#### Scenario: Confirmed account deletion succeeds
- **WHEN** user types "DELETE" and confirms account deletion AND user does not own any projects
- **THEN** the system SHALL call `DELETE /api/auth/profile`, remove the profile record, delete the Supabase auth user, clear the local session, and redirect to `/login`

#### Scenario: Account deletion blocked by owned projects
- **WHEN** user attempts to delete their account AND user owns one or more projects
- **THEN** the system SHALL display an error message listing the owned projects and instruct the user to transfer ownership or delete those projects first

#### Scenario: Account deletion cancellation
- **WHEN** user opens the deletion confirmation modal but clicks cancel or closes the modal
- **THEN** the system SHALL NOT delete the account and SHALL return to the settings page

### Requirement: Profile update API endpoint
The server SHALL provide `PATCH /api/auth/profile` to update the authenticated user's profile name. The endpoint MUST validate the request body with a Zod schema.

#### Scenario: Valid profile update
- **WHEN** an authenticated request sends `PATCH /api/auth/profile` with `{ "name": "New Name" }`
- **THEN** the server SHALL update the profile's `name` column and return the updated profile object

#### Scenario: Unauthenticated profile update
- **WHEN** an unauthenticated request sends `PATCH /api/auth/profile`
- **THEN** the server SHALL return 401 Unauthorized

### Requirement: Account deletion API endpoint
The server SHALL provide `DELETE /api/auth/profile` to delete the authenticated user's account. The endpoint MUST check for owned projects before proceeding.

#### Scenario: Successful account deletion
- **WHEN** an authenticated user with no owned projects sends `DELETE /api/auth/profile`
- **THEN** the server SHALL delete the user's profile record, delete the Supabase auth user via service role, and return 200

#### Scenario: Deletion blocked by owned projects
- **WHEN** an authenticated user who owns projects sends `DELETE /api/auth/profile`
- **THEN** the server SHALL return 400 with a list of owned project names/IDs

#### Scenario: Unauthenticated deletion attempt
- **WHEN** an unauthenticated request sends `DELETE /api/auth/profile`
- **THEN** the server SHALL return 401 Unauthorized
