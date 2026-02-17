# Linkify

Linkify is a single-user link shortener built with Next.js and deployed on Vercel. It combines a fast public redirect layer with a private dashboard for managing links and viewing analytics.

## Key Features

- Edge redirect handler for low-latency slug resolution and HTTP 307 redirects
- Private dashboard for creating, editing, activating, expiring, and deleting links
- Click analytics with time-series charts, country breakdowns, and top referrers
- Server-side QR code generation for each short link
- GitHub OAuth sign-in restricted to one authorized GitHub account ID

## Tech Stack

- Next.js (App Router, Server Components, Server Actions, Edge runtime)
- TypeScript (strict mode)
- Auth.js v5 with GitHub OAuth
- Vercel Postgres with Drizzle ORM and drizzle-kit
- Tailwind CSS v4 + shadcn/ui + Radix UI
- Recharts, Zod, NanoID, Sonner

## Architecture Overview

- Public redirect path: requests to `/{slug}` are handled by `src/app/[slug]/route.ts` at the edge, validated against link state/expiration, and redirected with asynchronous analytics writes
- Private dashboard path: authenticated routes under `/dashboard` render server-side UI and call Server Actions for mutations and analytics queries

## Prerequisites

- Node.js 20+
- pnpm 9+
- A PostgreSQL database (Vercel Postgres recommended)
- A GitHub OAuth app

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Create your environment file from the example:

```bash
cp .env.example .env.local
```

3. Fill in values in `.env.local`.

4. Start the development server:

```bash
pnpm dev
```

App runs at `http://localhost:3000`.

## Database Setup

Use the existing scripts in `package.json`:

```bash
pnpm db:push
pnpm db:migrate
pnpm db:generate
pnpm db:studio
```

Recommended local flow:

- Use `pnpm db:push` for fast schema sync during development
- Use `pnpm db:generate` + `pnpm db:migrate` when maintaining SQL migrations

## Auth Setup Notes

- Configure `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` from your GitHub OAuth app
- Set `AUTHORIZED_GITHUB_ID` to the numeric GitHub user ID of the only account that should access `/dashboard`
- Set `AUTH_SECRET` for session encryption and integrity

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Start the local Next.js development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run Biome checks |
| `pnpm format` | Format code with Biome |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Apply generated migrations |
| `pnpm db:push` | Push schema directly to database |
| `pnpm db:studio` | Open Drizzle Studio |

## Project Structure

```text
src/
  app/                  Next.js routes (public redirects, login, dashboard)
  actions/              Server Actions for link and analytics operations
  components/           Dashboard, analytics, shared, and UI components
  db/                   Drizzle schema, client setup, and migrations
  lib/                  Validation, auth helpers, slug and QR utilities
  types/                Shared TypeScript types
```

## Security and Privacy

- Designed for single-user administration, not multi-tenant access
- Dashboard access is restricted by GitHub OAuth + `AUTHORIZED_GITHUB_ID`
- Redirect analytics store only operational fields: `link_id`, `clicked_at`, `country` (optional), and `referrer` (optional)
- Analytics writes are asynchronous so redirects are not blocked

## Deployment (Vercel)

- Recommended target is Vercel with Vercel Postgres
- Configure all required environment variables in the Vercel project settings
- Ensure `NEXT_PUBLIC_APP_URL` matches your production short-link domain

## License

This project is licensed under the MIT License. See `LICENSE` for details.
