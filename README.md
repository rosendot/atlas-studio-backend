# Atlas Studio Backend (`atlas-studio-backend`)

Cloudflare Worker (Hono + D1 + R2) that powers Atlas Studio's lead pipeline and client portal.

## What Atlas Studio sells

A custom Astro website for local businesses, hosted on Cloudflare Pages. Clients log into a portal (this backend) to follow their build, exchange messages, and pull files. See [CLAUDE.md](./CLAUDE.md) for what this backend specifically powers, and [`../atlas-studio-frontend/CLAUDE.md`](../atlas-studio-frontend/CLAUDE.md) for the full positioning rules. Any user-facing string this backend emits must match that voice.

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars     # local secrets for `wrangler dev`
npm run dev                         # http://localhost:8787
```

Bindings (D1, R2, KV) are configured in [`wrangler.toml`](./wrangler.toml). Run `wrangler login` once before deploying.

## Database

```bash
npm run migrate          # apply migrations to local D1
npm run migrate:remote   # apply migrations to production D1
npm run seed             # insert dev seed data into local D1
```

## Deploy

```bash
npm run deploy           # publishes Worker to api.atlasstudio.<tld>
```

There is no Docker image, no Cloud Run service, no Cloud SQL. Deployment is `wrangler deploy`.

## API Routes

### Auth — Better Auth (mounted at `/api/auth/*`)
Better Auth handles sign-in, sign-up, OAuth callbacks, password reset, email verification, and sign-out at `/api/auth/*`. The frontend calls these via Better Auth's client SDK; you don't hand-roll fetches.

### Public
- `POST /leads` — contact form submission
- `POST /auth/reset` — public-safe password-reset request (always responds success)

### Admin (Better Auth session required, `role: admin`)
- `GET /leads` — list all leads
- `PATCH /leads/:id` — update lead status
- `POST /auth/invite` — convert lead to client
- `GET /clients` — list all clients
- `GET /projects` — list all projects
- `POST /projects` — create project
- `PATCH /projects/:id` — update project
- `POST /milestones` — create milestone
- `PATCH /milestones/:id` — update milestone

### Client (Better Auth session required, own project only)
- `GET /projects` — view their projects
- `GET /projects/:id` — view project details
- `GET /milestones?project_id=xxx` — view milestones
- `GET /messages?project_id=xxx` — view messages
- `POST /messages` — send message
- `GET /files?project_id=xxx` — list files
- `GET /files/:id/download` — get short-lived presigned R2 URL
- `POST /files` — upload file (multipart) to R2

## Generating `BETTER_AUTH_SECRET`

```bash
openssl rand -base64 32
```

Set it once locally in `.dev.vars` and once in production via `wrangler secret put BETTER_AUTH_SECRET`. Don't rotate without a plan — rotating invalidates all active sessions.
