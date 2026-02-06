# Curl Ticket

Curl Ticket is an API issue tracking app for engineering teams.
It helps teams reproduce backend problems by turning pasted cURL commands into structured issue records.

## Current Product Scope

Implemented in this repository:

- Google OAuth login with Supabase Auth
- Project creation and project list dashboard
- Issue creation from parsed cURL
- Issue detail and edit flows
- Request/response payload display with JSON highlighting
- Sensitive header masking in UI (for keys like `Authorization`, `token`, `api-key`)
- Access control at API level (project owner/member rules)

Planned or partial:

- Notification schema exists, but notification API/UI flow is not fully implemented
- No automated test suite yet (CI currently runs lint + typecheck)

## Tech Stack

- Nuxt 4 + Vue 3 + TypeScript
- Nuxt UI + Tailwind CSS
- Supabase (Auth)
- PostgreSQL + Drizzle ORM
- Zod validation
- `curlconverter` for cURL parsing
- Shiki for JSON code highlighting

## Requirements

- Node.js `22.x`
- pnpm `10.x`
- A Supabase project (Google OAuth enabled)
- PostgreSQL connection string (`DATABASE_URL`)

## Environment Variables

Copy `.env.example` to `.env` and fill values:

```bash
cp .env.example .env
```

Required keys:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `DATABASE_URL`

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Run database migrations:

```bash
pnpm db:migrate
```

3. Start development server:

```bash
pnpm dev
```

4. Open:

```text
http://localhost:3000
```

## Useful Scripts

### App

- `pnpm dev` - start dev server
- `pnpm build` - production build
- `pnpm preview` - preview production build
- `pnpm lint` - run ESLint
- `pnpm typecheck` - run Nuxt/Vue type checks

### Database (Drizzle)

- `pnpm db:generate` - generate migration from schema changes
- `pnpm db:migrate` - apply migrations
- `pnpm db:push` - push schema directly to DB
- `pnpm db:studio` - open Drizzle Studio
- `pnpm db:types` - generate Supabase TS types into `app/types/database.types.ts`
  - Note: this command currently uses a fixed Supabase project id in `package.json`

### Local utility scripts

- `node scripts/verify-schema.mjs` - print current DB schema from `information_schema`
- `node scripts/reset-db.mjs` - drop app tables and migration history (destructive)

## API Overview

All `/api/*` routes are protected by server auth middleware (except explicit public paths):

- `POST /api/curl/parse`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/issues`
- `POST /api/projects/:projectId/issues`
- `GET /api/projects/:projectId/issues/:issueId`
- `PATCH /api/projects/:projectId/issues/:issueId`

## Project Structure

```text
app/                  # Nuxt app (pages, components, composables, UI logic)
server/
  api/                # Server API routes
  database/           # Drizzle schema + SQL migrations
  middleware/         # Server auth middleware
shared/               # Shared constants and Zod schemas
docs/prd.md           # Product requirements draft
scripts/              # Local DB helper scripts
```

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) currently runs:

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`

## License

MIT (see `LICENSE`).
