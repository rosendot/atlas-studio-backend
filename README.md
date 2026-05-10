# Atlas Studio Backend (`atlas-studio-backend`)

Cloudflare Worker (Hono + D1 + R2) that powers Atlas Studio's lead pipeline and client portal.

## What Atlas Studio sells

A custom Astro website for local businesses, hosted on Cloudflare Pages. Clients log into a portal (this backend) to follow their build, exchange messages, and pull files. See [CLAUDE.md](./CLAUDE.md) for what this backend specifically powers, and [`../atlas-studio-frontend/CLAUDE.md`](../atlas-studio-frontend/CLAUDE.md) for the full positioning rules. Any user-facing string this backend emits must match that voice.

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars     # fill in local secrets
npm run dev                         # http://localhost:8787 (bound to production D1 + R2)
```

`wrangler dev --remote` runs the Worker on your laptop but reads/writes the real production D1 and R2 — so local dev sees the same data production sees. Be careful with writes: a test signup creates a real user. With no clients yet, this is a feature; once you have clients, you'd add separate dev resources.

Bindings (D1, R2) are configured in [`wrangler.toml`](./wrangler.toml) and consumed by Cloudflare's Workers Builds pipeline on every push to `main`.

## Database

Production D1 is the source of truth. The Drizzle TypeScript schema in [`src/db/schema.ts`](./src/db/schema.ts) must stay in sync with what's actually in the database.

To change the schema:
1. Edit `src/db/schema.ts` for the types
2. Apply the matching SQL to production D1 via the Cloudflare dashboard's D1 SQL console (or via MCP if you're working with Claude)

There are no local migration files. The schema lives in D1 itself.

## Deploy

Push to `main`. Cloudflare's Workers Builds picks it up via the connected GitHub repo, runs `npm install` and `npx wrangler deploy`, and ships it. No CLI deploy from your laptop required.

Secrets live in the Cloudflare dashboard (Workers → atlas-studio-backend → Settings → Variables and Secrets), not in the repo.

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
- `GET /files/:id/download` — Worker-streamed R2 download
- `POST /files` — upload file (multipart) to R2
- `DELETE /files/:id` — remove file from R2 and DB (admin, or owner client)

## Generating `BETTER_AUTH_SECRET`

Use 1Password's password generator (or any 32+ character random string). Set it in `.dev.vars` for local dev, and in the Cloudflare dashboard for production. Don't rotate without a plan — rotating invalidates all active sessions.
