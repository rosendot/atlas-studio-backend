# Atlas Studio Backend (`atlas-studio-backend`)

Cloudflare Worker (Hono) that powers Atlas Studio's lead pipeline and **client portal** — the place clients log in to follow their build, exchange messages, and grab files. Runs on Cloudflare's edge with D1 (SQLite) for application + auth data and R2 for file storage.

## What this powers

Atlas Studio sells **custom Astro websites for local businesses**, hosted on Cloudflare Pages. The website itself is static and ships from each client's own GitHub repo. This backend is the relationship layer around that delivery:

- **Public:** capture leads from the marketing site contact form
- **Admin (you):** triage leads, convert qualified ones into clients, run projects, post milestone updates, exchange messages and files
- **Client:** authenticated portal to follow their build, send messages, and pull files. The portal is purely the studio relationship layer — site content (menu, hours, photos, copy) is updated by the studio on request via email, **not** edited in the portal.

For full positioning, audience, hook, tone rules, and banned words, see [`atlas-studio-frontend/CLAUDE.md`](../atlas-studio-frontend/CLAUDE.md). Anything user-facing emitted by this backend (email subjects, body copy, error messages a client could see) must match that voice: plainspoken, confident, slightly dry. POS integration is a feature, never a hook.

## Commands

- `npm run dev` — local Worker at http://localhost:8787, **bound to production D1 + R2** via `wrangler dev --remote`. Lets you debug the real flow against real data without deploying. Be careful — writes affect production.
- `npm run typecheck` — TypeScript type-check the project

Deploys happen via Cloudflare's dashboard Git integration on every push to `main`. Schema lives only in production D1 (no migration files in the repo) — to change it, edit [`src/db/schema.ts`](src/db/schema.ts) for the Drizzle types and apply the corresponding SQL to production D1 via the dashboard console or MCP.

## Stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono (lightweight, edge-first router)
- **Language:** TypeScript (ESM)
- **Database:** Cloudflare D1 (SQLite at the edge), accessed via Drizzle ORM
- **Auth:** Better Auth (self-hosted, sessions in D1) — email/password + Google OAuth
- **Email:** Resend (lead alerts, milestone notifications, password reset / verification)
- **File storage:** Cloudflare R2 (uploads + Worker-streamed downloads)
- **Hosting:** Cloudflare Workers (one Worker, custom domain `api.atlasstudio.<tld>`)

There is no Express, no Node runtime, no Cloud Run, no Cloud SQL, no GCS, no Docker, no Firebase. All of that is gone. If you find references to it, they're stale and should be removed.

## Architecture

```
src/
├── index.ts              # Hono app entry — mounts /api/auth/* and routers
├── lib/
│   └── auth.ts           # Better Auth instance factory — getAuth(env)
├── routes/               # Route modules (Hono routers)
│   ├── leads.ts          # POST /leads (public), GET/PATCH (admin)
│   ├── auth.ts           # POST /auth/invite, /auth/reset (studio-side flows)
│   ├── clients.ts        # GET /clients (admin)
│   ├── projects.ts       # CRUD for projects
│   ├── milestones.ts     # CRUD for milestones
│   ├── messages.ts       # Project message threads
│   └── files.ts          # File upload + Worker-streamed download via R2
├── middleware/
│   ├── auth.ts           # Better Auth session check, sets c.var.uid + c.var.role
│   └── adminOnly.ts      # Restricts route to admin
├── services/
│   ├── email.ts          # Resend wrapper (lead alerts, milestone emails)
│   ├── storage.ts        # R2 helpers — put, getFileResponse, delete
│   └── notifications.ts  # Composed flows (e.g. milestone completion email)
├── db/
│   ├── client.ts         # Drizzle client factory — getDb(env)
│   └── schema.ts         # Drizzle schema for typed queries (app tables + Better Auth tables)
└── utils/
    ├── validate.ts       # Input validation helpers
    └── response.ts       # Consistent JSON response shape (Hono c.json wrappers)
```

## Auth Model

- **Better Auth** handles identity, password hashing (Argon2id), session cookies, password resets, email verification, and OAuth.
- Mounted at `/api/auth/*` in [`src/index.ts`](src/index.ts) — sign-in, sign-up, callbacks, etc. all live there.
- The Better Auth instance is built per-request via `getAuth(env)` in [`src/lib/auth.ts`](src/lib/auth.ts), because bindings (D1, secrets) live on `env` not in module scope.
- `requireAuth` middleware (in [`src/middleware/auth.ts`](src/middleware/auth.ts)) calls `auth.api.getSession({ headers })` — sets `c.var.uid` and `c.var.role`.
- `ADMIN_UID` secret identifies the studio admin (you). Anyone else is treated as `client`.
- `adminOnly` middleware restricts routes to admin.
- Clients can only access their own project data — every query joins `clients` via `auth_uid` and filters by `c.var.uid`.

### Auth tables (Better Auth-owned)

`user`, `session`, `account`, `verification` — schema names match Better Auth's defaults so the Drizzle adapter picks them up automatically. Defined in [`src/db/schema.ts`](src/db/schema.ts). Don't rename without also updating the `schema` map in [`src/lib/auth.ts`](src/lib/auth.ts).

The application's `clients.auth_uid` column is a foreign key into `user.id` — that's the link between a paying client and their auth identity.

## Database

D1 (SQLite). Application tables: `leads`, `clients`, `projects`, `milestones`, `messages`, `files`. Auth tables (Better Auth-owned): `user`, `session`, `account`, `verification`.

Production D1 is the **single source of truth** for the schema. The Drizzle TypeScript schema in [`src/db/schema.ts`](src/db/schema.ts) is what queries use for typed access — keep it in sync with what's actually in production D1.

When changing the schema:
1. Edit `src/db/schema.ts` for the Drizzle types
2. Apply the corresponding SQL to production D1 via the Cloudflare dashboard SQL console (or MCP)
3. There are no migration files, no local schema files. Production is the schema.

Local dev (`wrangler dev --remote`) connects to production D1 directly, so there's no local database to keep in sync.

The `leads.pos` column captures which POS the prospect uses (Square / Toast / Clover / Other / None) so the studio knows up-front whether an integration is in scope. It's a data point for sizing the build, not a marketing axis.

## File Storage

R2 bucket `atlas-studio-files`, bound in `wrangler.toml` as `FILES`. Files are uploaded by clients/admin through `POST /files` (multipart), stored under `projects/<project_id>/<file_id>-<filename>`. R2 doesn't expose Cloudflare-issued presigned URLs to bound buckets, so `GET /files/:id/download` streams the file through the Worker itself — `requireAuth` is the access boundary.

## Frontend Connection

The Astro marketing site (`atlas-studio-frontend`, deployed to Cloudflare Pages) sends contact form submissions to `POST /leads` and renders the authenticated client portal pages. The frontend uses Better Auth's client SDK (`better-auth/client`) to call `/api/auth/*` directly — sign-in, sign-out, password reset, OAuth.

CORS is allowed from `FRONTEND_URL` only, with `credentials: true` so the session cookie is included on cross-origin calls. Frontend `fetch` calls must set `credentials: "include"`.

## Environment Variables / Bindings

Set via `wrangler secret put` for sensitive values, or `[vars]` in `wrangler.toml` for plain config.

**Secrets (Cloudflare dashboard → Worker → Settings → Variables and Secrets):**
- `RESEND_API_KEY` — Resend API key
- `BETTER_AUTH_SECRET` — random 32+ byte secret used to sign session cookies
- `ADMIN_UID` — Better Auth `user.id` of the studio admin (you)
- `GOOGLE_CLIENT_ID` *(optional)* — for Sign in with Google
- `GOOGLE_CLIENT_SECRET` *(optional)* — for Sign in with Google

**Plain vars (`[vars]` in `wrangler.toml`):**
- `FRONTEND_URL` — frontend origin (e.g. `https://atlasstudio.<tld>`); used for CORS, cookie domain, and the `baseURL` Better Auth bakes into emails

**Bindings:**
- `DB` — D1 database
- `FILES` — R2 bucket
