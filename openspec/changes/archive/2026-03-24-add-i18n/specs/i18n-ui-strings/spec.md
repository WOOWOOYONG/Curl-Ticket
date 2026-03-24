## ADDED Requirements

### Requirement: All static UI text uses translation keys
The system SHALL replace all hardcoded UI strings in pages, components, and layouts with `t()` or `$t()` translation function calls.

#### Scenario: Page renders with active locale
- **WHEN** a user views any page with the locale set to `zh-TW`
- **THEN** all static UI text (labels, headings, buttons, placeholders, tooltips, empty states) SHALL display in Traditional Chinese

#### Scenario: Page renders with default locale
- **WHEN** a user views any page with the locale set to `en`
- **THEN** all static UI text SHALL display in English, matching the current hardcoded text exactly

### Requirement: Dynamic strings support interpolation
The system SHALL support variable interpolation in translation strings for dynamic content such as counts, names, and statuses.

#### Scenario: Issue count display
- **WHEN** a project has 5 issues and the locale is `en`
- **THEN** the system SHALL display the interpolated string (e.g., "5 issues") using `t('issues.count', { count: 5 })`

#### Scenario: Interpolated string in zh-TW
- **WHEN** a project has 5 issues and the locale is `zh-TW`
- **THEN** the system SHALL display the zh-TW interpolated string (e.g., "5 個問題")

### Requirement: Shared constants remain untranslated in code
The system SHALL NOT translate enum values or shared constants (IssueStatus, HttpMethod, Environment, UserRole). These values SHALL remain in English in the code and database. Display labels for these values SHALL use translation keys.

#### Scenario: Issue status display
- **WHEN** an issue has status `IssueStatus.Open` and the locale is `zh-TW`
- **THEN** the stored value SHALL remain `"Open"` but the display label SHALL show the zh-TW translation (e.g., "開啟")

### Requirement: English and Traditional Chinese locale coverage
The system SHALL provide complete translations for both `en` and `zh-TW` locales, covering all static UI strings across all pages and components.

#### Scenario: No untranslated strings in zh-TW
- **WHEN** a developer audits `i18n/locales/zh-TW.json`
- **THEN** every key present in `i18n/locales/en.json` SHALL also be present in `zh-TW.json`
