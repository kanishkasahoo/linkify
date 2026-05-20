# AGENTS.md — Linkify

> AI agent instructions for the Linkify project. Read this file first before making changes.

## Project Summary

Linkify is a **personal link shortener** built with **React Router v7 Framework Mode** and deployed as a Node.js application, typically in Docker. It serves two workloads:

1. **Public redirect engine** — slug lookups that redirect visitors via HTTP 307 with asynchronous analytics recording
2. **Private admin dashboard** — server-rendered dark-mode UI for link management, analytics, and QR code generation

Single-user application. One admin authenticates through GitHub OAuth and is locked to a specific GitHub account ID.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Router v7 Framework Mode, Vite, SSR |
| Language | TypeScript strict mode |
| Database | PostgreSQL |
| ORM | Drizzle ORM with drizzle-kit for migrations |
| Auth | GitHub OAuth with React Router cookie sessions |
| Styling | Tailwind CSS v4, dark mode only |
| UI Components | shadcn/ui style Radix primitives copied into project |
| Charts | Recharts |
| QR Codes | qrcode |
| Slug Generation | nanoid |
| Validation | zod |
| Icons | lucide-react |
| Toasts | sonner |

## Project Structure

```text
app/
├── root.tsx                 ← React Router document, styles, outlet, errors
├── routes.ts                ← Route configuration
└── routes/                  ← Route modules with loaders/actions
    ├── home.tsx
    ├── login.tsx
    ├── auth.github.tsx
    ├── auth.github.callback.tsx
    ├── logout.tsx
    ├── dashboard.tsx
    ├── dashboard._index.tsx
    ├── dashboard.links.tsx
    ├── dashboard.links.$id.tsx
    ├── resources.qr.$slug.tsx
    ├── healthz.ts
    └── $.tsx               ← Public short-link redirect route
src/
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── analytics/
│   └── shared/
├── db/
│   ├── index.ts
│   ├── schema.ts
│   └── migrations/
├── lib/
│   ├── auth.server.ts
│   ├── slug.ts
│   ├── qr.ts
│   ├── validations.ts
│   ├── constants.ts
│   └── utils.ts
├── services/               ← Server-only business logic used by loaders/actions
└── types/index.ts
```

## Build & Dev Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm typecheck
pnpm lint
pnpm db:push
pnpm db:migrate
pnpm db:generate
pnpm db:studio
docker compose up --build
```

## Database Schema

Two tables with a one-to-many relationship:

**`links`** — Short URL definitions
- `id` UUID PK
- `slug` VARCHAR unique
- `url` TEXT
- `is_active` BOOLEAN
- `expires_at` TIMESTAMP nullable
- `created_at`, `updated_at`

**`clicks`** — Analytics events
- `id` UUID PK
- `link_id` UUID FK to `links.id` ON DELETE CASCADE
- `country` VARCHAR(2) nullable
- `referrer` TEXT nullable
- `clicked_at` TIMESTAMP

## Architecture Patterns

### Redirect Flow

The `/:slug` resource route queries the database, validates active/expiration state, sanitizes the target URL, returns a 307 redirect, and launches analytics insertion in a detached promise. Analytics writes must never block redirects.

### Authentication

GitHub OAuth is implemented in React Router route modules. Cookie sessions store the authorized GitHub user after `/auth/github/callback` verifies `AUTHORIZED_GITHUB_ID`. Protected dashboard loaders/actions call `requireUser(request)`.

### Loaders And Actions

Route loaders fetch server-side data. Route actions handle mutations. Business logic lives in `src/services/*.server.ts`, while route modules handle request parsing, auth checks, and response shaping.

### Client Components

Interactive components use React Router primitives such as `Link`, `useNavigate`, `useSearchParams`, and `useFetcher`. Prefer server route loaders/actions for data and mutations.

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

Fonts: Inter for sans, JetBrains Mono for slugs and URLs.

## Validation Rules

- **URL:** Valid HTTP/HTTPS, max 2048 chars, no `javascript:`, `data:`, or `file:` protocols
- **Slug:** 3-64 chars, `/^[a-zA-Z0-9_-]+$/`, must not be in reserved list
- **Reserved slugs:** `dashboard`, `api`, `login`, `logout`, `auth`, `_next`, `favicon.ico`, `robots.txt`, `sitemap.xml`
- **Expiration:** Valid future ISO 8601 datetime

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Cookie session secret |
| `AUTH_GITHUB_ID` | GitHub OAuth client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth client secret |
| `AUTH_GITHUB_REDIRECT_URI` | Exact GitHub OAuth callback URL registered for the app |
| `AUTHORIZED_GITHUB_ID` | GitHub user ID allowed to log in |
| `POSTGRES_URL` | PostgreSQL connection string |
| `POSTGRES_URL_NON_POOLING` | Direct PostgreSQL connection for migrations |
| `APP_URL` | Public short URL origin |

## Important Conventions

- All times are stored and displayed in UTC.
- Slugs are case-sensitive.
- Analytics writes must never block redirects.
- Always validate on both client and server side.
- Route actions return `{ success: true, data }` or `{ success: false, error }`.
- QR codes are generated server-side and returned as data URLs.
- Pagination state lives in URL search params.
