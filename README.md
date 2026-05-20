# Linkify

Linkify is a single-user link shortener built with React Router v7 Framework Mode. It combines a public redirect engine with a private dashboard for managing links, QR codes, and analytics.

## Features

- HTTP 307 short-link redirects
- Asynchronous click analytics recording
- GitHub OAuth login restricted to one authorized GitHub account ID
- Link create, edit, delete, activate, deactivate, search, filter, sort, and pagination
- Dashboard stats, time-series charts, country breakdowns, and top referrers
- Server-side QR code generation and PNG download
- Docker and Docker Compose support

## Tech Stack

- React Router v7 Framework Mode, Vite, React 19
- TypeScript strict mode
- PostgreSQL with Drizzle ORM and drizzle-kit
- Tailwind CSS v4, Radix UI primitives, shadcn-style components
- Recharts, Zod, NanoID, Sonner, qrcode

## Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL
- GitHub OAuth app
- Docker, if using the container workflow

## Environment

Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

Required values:

```bash
SESSION_SECRET=replace-with-a-long-random-secret
AUTH_GITHUB_ID=github-oauth-client-id
AUTH_GITHUB_SECRET=github-oauth-client-secret
AUTH_GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
AUTHORIZED_GITHUB_ID=numeric-github-user-id
APP_URL=http://localhost:3000
```

Local database commands default to `postgres://linkify:linkify@localhost:5432/linkify`, which is the Postgres container published by Compose. Override `POSTGRES_URL` only for a non-local database.

For GitHub OAuth local development, set the callback URL to:

```text
http://localhost:3000/auth/github/callback
```

`AUTH_GITHUB_REDIRECT_URI` must exactly match the callback URL configured in the GitHub OAuth app, including scheme, host, port, and path. For example, `http://localhost:3000/auth/github/callback` and `http://127.0.0.1:3000/auth/github/callback` are different values to GitHub.

## Local Development

```bash
pnpm install
pnpm db:push
pnpm dev
```

The app runs at `http://localhost:3000`.

## Docker

Run the app and a local Postgres database:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

The base `docker-compose.yml` is safe for Dokploy and other reverse-proxy deployments: it exposes container ports to the Docker network without binding host ports. The local override publishes `3000` and `5432` on your machine.

`docker-compose.dokploy.yml` is the Dokploy-specific compose file for `go.ksahoo.com`. It attaches the app to `dokploy-network` and declares explicit Traefik labels for container port `3000`.

For Docker, either export the GitHub OAuth variables in your shell, put them in a Compose `.env` file, or run Compose with `--env-file .env.local`. Only the variables explicitly listed in `docker-compose.yml` are passed to the app container. If you access the container through a domain or non-localhost address, set `APP_URL` and `AUTH_GITHUB_REDIRECT_URI` to that same public origin.

The Docker image runs checked-in SQL migrations automatically before starting the web server. To apply schema migrations manually from the host:

```bash
pnpm db:migrate
```

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Start React Router dev server |
| `pnpm build` | Build production client and server bundles |
| `pnpm start` | Start the production React Router server |
| `pnpm typecheck` | Generate route types and run TypeScript |
| `pnpm lint` | Run Biome checks |
| `pnpm format` | Format code with Biome |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Apply generated migrations |
| `pnpm db:push` | Push schema directly to database |
| `pnpm db:studio` | Open Drizzle Studio |

## Project Layout

```text
app/
  root.tsx                React Router document and app outlet
  routes.ts               Route config
  routes/                 Loaders, actions, pages, and resource routes
src/
  components/             Dashboard, analytics, shared, and UI components
  db/                     Drizzle schema and database client
  lib/                    Auth, validation, slug, QR, constants, utilities
  services/               Server-side business logic
  types/                  Shared TypeScript types
```

## Architecture

- Public redirects are handled by `app/routes/$.tsx`, which delegates lookup and analytics to `src/services/redirect.server.ts`.
- Dashboard routes use React Router loaders for reads and actions for mutations.
- GitHub OAuth is implemented with `/auth/github` and `/auth/github/callback`.
- Authentication state is stored in an HTTP-only cookie session.
- Analytics writes are detached from redirects so slow inserts do not delay visitors.

## License

MIT. See `LICENSE`.
