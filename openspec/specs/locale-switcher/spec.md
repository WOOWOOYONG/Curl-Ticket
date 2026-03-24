## Purpose
Define the locale switching experience so users can select between supported languages from the application interface before and after authentication.

## Requirements

### Requirement: Locale switcher component
The system SHALL provide a `LocaleSwitcher` component that allows users to switch between available locales.

#### Scenario: Switcher displays available locales
- **WHEN** a user interacts with the locale switcher
- **THEN** the switcher SHALL display all available locales with their native names (e.g., "English", "繁體中文")

#### Scenario: Switching locale updates the UI
- **WHEN** a user selects `zh-TW` from the locale switcher
- **THEN** the entire UI SHALL immediately re-render with Traditional Chinese translations without a page reload

#### Scenario: Current locale is indicated
- **WHEN** the locale switcher is displayed
- **THEN** the currently active locale SHALL be visually indicated (e.g., selected state, checkmark)

### Requirement: Locale switcher placement in header
The `LocaleSwitcher` component SHALL be placed in the `AppHeader` component, visible on all authenticated pages.

#### Scenario: Switcher visible on all pages
- **WHEN** a user navigates to any authenticated page
- **THEN** the locale switcher SHALL be visible in the app header

#### Scenario: Switcher not visible on public pages
- **WHEN** a user is on the login or register page
- **THEN** the locale switcher SHALL still be accessible (either in the header or on the page itself) so users can choose their language before authenticating
