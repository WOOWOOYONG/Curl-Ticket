## 1. Module Setup

- [x] 1.1 Install `@nuxtjs/i18n` dependency
- [x] 1.2 Create `i18n/locales/en.json` with initial structure (common keys: save, cancel, delete, confirm, loading, etc.)
- [x] 1.3 Create `i18n/locales/zh-TW.json` with matching keys translated to Traditional Chinese
- [x] 1.4 Configure `@nuxtjs/i18n` in `nuxt.config.ts` (strategy: `no_prefix`, defaultLocale: `en`, lazy loading, fallbackLocale: `en`, cookie-based detection)

## 2. Locale Switcher Component

- [x] 2.1 Create `app/components/LocaleSwitcher.vue` using Nuxt UI `USelect` or `UDropdown` to switch between `en` and `zh-TW`
- [x] 2.2 Integrate `LocaleSwitcher` into `app/components/AppHeader.vue`

## 3. Extract UI Strings — Auth & Layout Pages

- [x] 3.1 Extract hardcoded strings from `app/pages/login.vue` and replace with `t()` calls
- [x] 3.2 Extract hardcoded strings from `app/pages/register.vue`
- [x] 3.3 Extract hardcoded strings from `app/pages/confirm.vue`
- [x] 3.4 Extract hardcoded strings from `app/pages/auth/device.vue`
- [x] 3.5 Extract hardcoded strings from `app/components/AppHeader.vue` and `app/components/AppLogo.vue`

## 4. Extract UI Strings — Project Pages & Components

- [x] 4.1 Extract hardcoded strings from `app/pages/index.vue` (dashboard/project list)
- [x] 4.2 Extract hardcoded strings from `app/pages/projects/create.vue`
- [x] 4.3 Extract hardcoded strings from `app/pages/projects/[id]/index.vue`
- [x] 4.4 Extract hardcoded strings from `app/pages/projects/[id]/edit.vue`
- [x] 4.5 Extract hardcoded strings from `app/pages/projects/[id]/members.vue`
- [x] 4.6 Extract hardcoded strings from `app/components/ProjectForm.vue` and `app/components/ProjectMenuIcon.vue`

## 5. Extract UI Strings — Issue Pages & Components

- [x] 5.1 Extract hardcoded strings from `app/pages/projects/[id]/issues/create.vue`
- [x] 5.2 Extract hardcoded strings from `app/pages/projects/[id]/issues/[issueId]/index.vue`
- [x] 5.3 Extract hardcoded strings from `app/pages/projects/[id]/issues/[issueId]/edit.vue`
- [x] 5.4 Extract hardcoded strings from `app/components/IssueForm.vue` and `app/components/ApiBugForm.vue`
- [x] 5.5 Extract hardcoded strings from `app/components/IssueComments.vue` and `app/components/CommentCard.vue`

## 6. Extract UI Strings — Settings, Admin & Shared Components

- [x] 6.1 Extract hardcoded strings from `app/pages/settings/index.vue` and `app/pages/settings/tokens.vue`
- [x] 6.2 Extract hardcoded strings from `app/pages/admin/index.vue`
- [x] 6.3 Extract hardcoded strings from `app/components/NotificationBell.vue`, `app/components/InvitationResponseModal.vue`, `app/components/ConfirmModal.vue`, `app/components/TaskForm.vue`
- [x] 6.4 Extract hardcoded strings from `app/components/JsonCodeBlock.vue` (if any)

## 7. Display Labels for Constants

- [x] 7.1 Add translation keys for `IssueStatus` display labels (`issues.status.open`, `issues.status.inProgress`, `issues.status.done`, `issues.status.close`)
- [x] 7.2 Add translation keys for `Environment` display labels (`issues.env.local`, `issues.env.dev`, `issues.env.staging`, `issues.env.prod`)
- [x] 7.3 Add translation keys for `HttpMethod` display labels (if displayed as labels anywhere)
- [x] 7.4 Add translation keys for `UserRole` and `InvitationStatus` display labels

## 8. Verification

- [x] 8.1 Verify all keys in `en.json` exist in `zh-TW.json` (no missing translations)
- [x] 8.2 Run `pnpm lint` and fix any ESLint issues
- [x] 8.3 Run `pnpm typecheck` and fix any type errors
- [ ] 8.4 Manually verify locale switching works on key pages (login, project list, issue detail)
