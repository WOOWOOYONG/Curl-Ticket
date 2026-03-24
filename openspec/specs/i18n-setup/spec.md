## Purpose
Define the core internationalization infrastructure for Curl Ticket, including Nuxt i18n integration, locale loading, fallback behavior, persistence, and translation file organization.

## Requirements

### Requirement: i18n module integration
The system SHALL integrate `@nuxtjs/i18n` as a Nuxt module with lazy-loaded locale files and cookie-based locale persistence.

#### Scenario: Module is registered and configured
- **WHEN** the Nuxt application starts
- **THEN** the `@nuxtjs/i18n` module SHALL be loaded with `no_prefix` strategy, `en` as the default locale, and `zh-TW` as an additional locale

#### Scenario: Locale files are lazy-loaded
- **WHEN** a user switches to a locale that has not been loaded yet
- **THEN** the system SHALL load only the translation file for that locale on demand, without loading all locales upfront

### Requirement: Default locale fallback
The system SHALL use English (`en`) as the fallback locale when a translation key is missing in the active locale.

#### Scenario: Missing translation key in zh-TW
- **WHEN** the active locale is `zh-TW` and a translation key exists in `en` but not in `zh-TW`
- **THEN** the system SHALL display the English translation as a fallback

#### Scenario: Missing translation key in all locales
- **WHEN** a translation key does not exist in any locale file
- **THEN** the system SHALL display the raw key string and log a warning in development mode

### Requirement: Locale persistence via cookie
The system SHALL persist the user's selected locale in a cookie so it survives page reloads and new sessions.

#### Scenario: User selects a locale
- **WHEN** a user changes their locale to `zh-TW`
- **AND** the user refreshes the page or opens a new tab
- **THEN** the system SHALL restore `zh-TW` as the active locale from the cookie

#### Scenario: First-time visitor with no cookie
- **WHEN** a user visits the app for the first time with no locale cookie set
- **THEN** the system SHALL default to `en`

### Requirement: Translation file structure
The system SHALL organize translation files as flat JSON files at `i18n/locales/en.json` and `i18n/locales/zh-TW.json` using dot-namespaced keys grouped by feature area.

#### Scenario: Translation file key organization
- **WHEN** a developer looks up a translation key
- **THEN** keys SHALL follow the pattern `<feature>.<element>` (e.g., `projects.create`, `issues.status.open`, `common.save`)
