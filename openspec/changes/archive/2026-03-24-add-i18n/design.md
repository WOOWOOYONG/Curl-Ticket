## Context

Curl Ticket's UI is entirely in English with hardcoded strings across ~15 pages and ~13 components. The project serves engineering teams that may include Mandarin-speaking members (PRD is already in zh-TW). No i18n infrastructure exists today.

The app uses Nuxt 4 with Vue 3 Composition API, Nuxt UI v4 components, and Tailwind CSS. The `@nuxtjs/i18n` module is the standard solution for Nuxt apps and integrates seamlessly with the existing stack.

## Goals / Non-Goals

**Goals:**
- Integrate `@nuxtjs/i18n` with lazy-loaded locale files for `en` and `zh-TW`
- Extract all hardcoded UI strings into structured JSON translation files
- Provide a locale switcher in the app header
- Persist language preference across sessions via cookie

**Non-Goals:**
- Translating user-generated content or API error messages
- RTL support, database schema changes, or CLI i18n
- Server-side locale detection based on `Accept-Language` header (may add later)

## Decisions

### 1. Use `@nuxtjs/i18n` module

**Choice:** `@nuxtjs/i18n` (v9+)
**Rationale:** Official Nuxt module with built-in SSR support, lazy loading, Vue I18n integration, cookie-based persistence, and SEO helpers. No viable alternative in the Nuxt ecosystem.
**Alternatives considered:**
- Raw `vue-i18n`: Would work but requires manual Nuxt integration (SSR hydration, plugin setup, route handling). The module handles all of this automatically.
- Custom solution: Too much effort for a standard problem.

### 2. Locale strategy: `no_prefix`

**Choice:** No URL prefix strategy — locale is determined by cookie, not URL path.
**Rationale:** This app is a private tool behind auth, not a public-facing site. SEO-friendly locale URLs (`/en/projects`, `/zh-TW/projects`) add routing complexity with no benefit. Cookie persistence is sufficient.
**Alternatives considered:**
- `prefix_except_default`: Standard for public sites but adds unnecessary URL complexity for an internal tool.

### 3. Translation file structure: flat JSON, organized by page/feature

**Choice:** Single-level namespace in flat JSON files — `i18n/locales/en.json` and `i18n/locales/zh-TW.json`. Keys use dot-delimited namespaces grouped by feature area (e.g., `"projects.create"`, `"issues.status.open"`, `"common.save"`).

**Rationale:** With ~15 pages and ~13 components, the total string count is manageable in single files per locale. Splitting into per-page files would be premature. Namespaced keys keep things organized.

**Alternatives considered:**
- Per-page/component translation files with lazy loading: Over-engineered for this scale. Can split later if files grow large.

### 4. Translation key naming convention

**Choice:** Dot-separated hierarchical keys:
```
common.save          — shared UI labels
common.cancel
common.delete
auth.login           — auth pages
auth.register
projects.create      — project feature
projects.name
issues.status.open   — issue feature, nested by sub-concept
issues.form.title
nav.dashboard        — navigation/layout
nav.settings
```

**Rationale:** Predictable, grepable, and self-documenting. Matches the existing directory structure conceptually.

### 5. Locale switcher placement

**Choice:** Add a `LocaleSwitcher` component in `AppHeader.vue`, using a Nuxt UI `USelect` or `UDropdown`.
**Rationale:** Header is always visible across all authenticated pages. Consistent with common UX patterns.

## Risks / Trade-offs

- **Large diff for string extraction** → Mitigate by working page-by-page, verifying each page renders correctly after extraction. Group the work into logical commits.
- **Missing translations at runtime** → `@nuxtjs/i18n` falls back to the default locale (`en`) for missing keys. Set `fallbackLocale: 'en'` and enable missing-key warnings in dev mode.
- **Nuxt UI component labels** → Some Nuxt UI components have built-in text (e.g., pagination, empty states). These may need separate handling via the component's `label`/`placeholder` props. Verify during implementation.
- **Dynamic strings with variables** → Some UI strings include dynamic values (project names, counts). Use ICU-style interpolation: `t('issues.count', { count: 5 })` → `"{count} issues"`.
