## Why

Curl Ticket is used by engineering teams that may include members who speak different languages. The PRD and comments are already in Traditional Chinese (zh-TW), but the entire UI is hardcoded in English. Adding i18n support enables the app to serve multilingual teams — starting with English (en) and Traditional Chinese (zh-TW) — and establishes the foundation for additional languages in the future.

## What Changes

- Integrate `@nuxtjs/i18n` module for locale management, lazy-loaded translation files, and URL-based locale switching
- Extract all hardcoded UI strings from pages, components, and layouts into translation message files
- Add a locale switcher component to the app header so users can change language at any time
- Persist the user's language preference (cookie-based via `@nuxtjs/i18n` defaults)
- Provide translation files for two locales: `en` (English) and `zh-TW` (Traditional Chinese)

## Non-goals

- Translating user-generated content (issue titles, descriptions, comments, project names)
- Server-side error message translation (API error messages remain in English)
- Right-to-left (RTL) language support
- Database schema changes for locale storage
- CLI tool i18n (packages/cli remains English-only)

## Capabilities

### New Capabilities
- `i18n-setup`: Core i18n module configuration, locale files structure, and lazy-loading setup
- `i18n-ui-strings`: Extraction of all hardcoded UI strings into translation message files for en and zh-TW
- `locale-switcher`: UI component for switching between available locales, integrated into AppHeader

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Dependencies**: Adds `@nuxtjs/i18n` as a new Nuxt module
- **All pages and components**: Every `.vue` file with hardcoded text will be updated to use `$t()` / `t()` translation calls
- **Layouts**: `default.vue` layout and `AppHeader.vue` will include the locale switcher
- **Nuxt config**: `nuxt.config.ts` updated with i18n module registration and configuration
- **New files**: `i18n/locales/en.json`, `i18n/locales/zh-TW.json`, locale switcher component
- **PRD modules affected**: `docs/prd/non-functional.md` (add i18n as a non-functional requirement)
