# AGENTS.md — Linkify

> AI agent instructions for the Linkify project. Read this file first before making any changes.

## Project Summary

Linkify is a **personal link shortener** built with Next.js 15+ (App Router) and deployed on Vercel. It serves two workloads:

1. **Public redirect engine** — Edge-executed slug lookups that redirect visitors via HTTP 307 with async analytics recording
2. **Private admin dashboard** — Server-rendered dark-mode UI for link management, analytics, and QR code generation

Single-user application. One admin authenticated via GitHub OAuth (locked to a specific GitHub account ID).

## Detailed Documentation

Consult these files for comprehensive specifications:

- **`.docs/requirements.md`** — Full functional and non-functional requirements in EARS format
- **`.docs/architecture.md`** — System architecture, technology stack, data flow, and deployment
- **`.docs/design.md`** — Database schema, API design, UI layouts, validation rules, project structure
- **`.docs/implementation-plan.md`** — Phase-by-phase build plan with exit criteria

**Always read the relevant `.docs/` file before implementing a feature.**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15+ (App Router, Server Components, Server Actions) |
| Language | TypeScript (strict mode) |
| Database | Vercel Postgres (Neon-backed) |
| ORM | Drizzle ORM with drizzle-kit for migrations |
| Auth | Auth.js v5 (next-auth@beta) with GitHub OAuth provider |
| Styling | Tailwind CSS v4, dark mode only |
| UI Components | shadcn/ui (Radix UI primitives, copy-pasted into project) |
| Charts | Recharts |
| QR Codes | qrcode (npm) |
| Slug Generation | nanoid |
| Validation | zod |
| Icons | lucide-react |
| Toasts | sonner |

## Project Structure

```
src/
├── app/                    ← Next.js App Router pages and routes
│   ├── [slug]/route.ts     ← Edge redirect handler (runtime: 'edge')
│   ├── login/page.tsx      ← Login page
│   ├── dashboard/          ← Protected admin UI
│   │   ├── page.tsx        ← Dashboard home with stats
│   │   └── links/          ← Link management + detail pages
│   └── api/auth/           ← Auth.js route handlers
├── actions/                ← Server Actions for mutations and queries
├── auth.ts                 ← Auth.js configuration
├── middleware.ts           ← Route protection (dashboard only)
├── components/
│   ├── ui/                 ← shadcn/ui base components
│   ├── dashboard/          ← Dashboard-specific components
│   ├── analytics/          ← Chart and analytics components
│   └── shared/             ← Reusable components (copy-button, badges, etc.)
├── db/
│   ├── index.ts            ← Database client singleton
│   ├── schema.ts           ← Drizzle table definitions
│   └── migrations/         ← Generated SQL migrations
├── lib/
│   ├── slug.ts             ← NanoID generation + validation
│   ├── qr.ts               ← QR code generation
│   ├── validations.ts      ← Zod schemas
│   ├── constants.ts        ← Reserved slugs, config
│   └── utils.ts            ← cn(), formatters
└── types/index.ts          ← Shared TypeScript types
```

## Build & Dev Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (localhost:3000)
pnpm build                # Production build
pnpm lint                 # Run ESLint
pnpm drizzle-kit push     # Push schema changes to database
pnpm drizzle-kit studio   # Open Drizzle Studio (DB browser)
pnpm drizzle-kit generate # Generate migration SQL files
```

## Database Schema

Two tables with a one-to-many relationship:

**`links`** — Short URL definitions
- `id` (UUID PK), `slug` (VARCHAR UNIQUE), `url` (TEXT), `is_active` (BOOLEAN), `expires_at` (TIMESTAMP nullable), `created_at`, `updated_at`

**`clicks`** — Analytics events (one per redirect)
- `id` (UUID PK), `link_id` (UUID FK → links.id ON DELETE CASCADE), `country` (VARCHAR(2) nullable), `referrer` (TEXT nullable), `clicked_at` (TIMESTAMP)

Key indexes: unique on `slug`, composite on `(link_id, clicked_at)` for analytics queries.

## Architecture Patterns

### Redirect Flow (Edge Runtime)
The `[slug]/route.ts` handler runs at the edge. It queries the database for the slug, validates active status and expiration, returns a 307 redirect, and uses `waitUntil()` from `@vercel/functions` to write analytics asynchronously (non-blocking).

### Authentication
Auth.js v5 with GitHub OAuth. The `signIn` callback checks `profile.id` against the `AUTHORIZED_GITHUB_ID` env var. Middleware protects `/dashboard/*` routes. Server actions use a `requireAuth()` helper.

### Server Actions
All mutations (create, update, delete, toggle links) are Server Actions in `src/actions/`. They follow this pattern:
1. Call `requireAuth()` to verify session
2. Validate input with Zod
3. Execute database operation with Drizzle
4. Call `revalidatePath()` to refresh UI
5. Return `{ success: true, data }` or `{ success: false, error: string }`

### Client Components
Only use `"use client"` for interactive components: forms, charts, toasts, dialogs, bulk selection. Everything else should be a Server Component.

## Design System

Dark mode only. Industrial aesthetic. Key colors:
- Background: zinc-950 (#09090b)
- Cards: zinc-900 (#18181b)
- Borders: zinc-700 (#3f3f46)
- Text: zinc-50 (#fafafa) primary, zinc-400 (#a1a1aa) secondary
- Accent: blue-500 (#3b82f6)
- Destructive: red-500 (#ef4444)
- Success: green-500 (#22c55e)
- Warning: amber-500 (#f59e0b)

Fonts: Inter (sans), JetBrains Mono or Geist Mono (monospace for slugs/URLs).

## Validation Rules

- **URL:** Valid HTTP/HTTPS, max 2048 chars, no `javascript:`, `data:`, or `file:` protocols
- **Slug:** 3-64 chars, `/^[a-zA-Z0-9_-]+$/`, must not be in reserved list
- **Reserved slugs:** `dashboard`, `api`, `login`, `logout`, `auth`, `_next`, `favicon.ico`, `robots.txt`, `sitemap.xml`
- **Expiration:** Valid future ISO 8601 datetime

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Auth.js session secret |
| `AUTH_GITHUB_ID` | GitHub OAuth client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth client secret |
| `AUTHORIZED_GITHUB_ID` | GitHub user ID allowed to log in |
| `POSTGRES_URL` | Vercel Postgres connection string (pooled) |
| `POSTGRES_URL_NON_POOLING` | Direct connection for migrations |
| `NEXT_PUBLIC_APP_URL` | Public short URL domain (e.g., https://lnk.example.com) |

## Important Conventions

- All times are stored and displayed in UTC with timezone
- Slugs are case-sensitive
- Analytics writes must never block redirects
- Use `revalidatePath` after mutations to keep the dashboard fresh
- Prefer Server Components; only use Client Components for interactivity
- Always validate on both client (UX) and server (security) side
- Handle errors gracefully — return error objects, don't throw from Server Actions
- QR codes are generated server-side and returned as data URLs
- Pagination state lives in URL search params (bookmarkable)
