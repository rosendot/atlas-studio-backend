# Agency Backend

Node.js + Express REST API for the agency. Handles leads, client auth, project tracking, messaging, and file sharing. Deployed on Google Cloud Run.

## Commands

- `npm run dev` — local dev server with hot reload at http://localhost:8080
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled production build
- `npm run migrate` — run SQL migrations against DATABASE_URL
- `npm run seed` — insert dev seed data

## Stack

- **Runtime:** Node.js + Express 5
- **Language:** TypeScript (ESM)
- **Database:** PostgreSQL (Cloud SQL in production)
- **Auth:** Firebase Admin SDK (JWT verification, user creation)
- **Email:** Resend (lead alerts, client invites, milestone notifications)
- **File Storage:** Google Cloud Storage
- **Hosting:** Cloud Run (Dockerized)

## Architecture

```
src/
├── index.ts              # Express app entry point
├── routes/               # Route handlers
│   ├── leads.ts          # POST /leads (public), GET/PATCH (admin)
│   ├── auth.ts           # POST /auth/invite, /auth/reset
│   ├── clients.ts        # GET /clients (admin)
│   ├── projects.ts       # CRUD for projects
│   ├── milestones.ts     # CRUD for milestones
│   ├── messages.ts       # Project message threads
│   └── files.ts          # File upload/download via GCS
├── middleware/
│   ├── auth.ts           # Firebase JWT verification, attaches uid + role
│   ├── adminOnly.ts      # Restricts route to admin
│   └── errorHandler.ts   # Global error handler
├── services/
│   ├── firebase.ts       # Firebase Admin init
│   ├── email.ts          # Resend email helpers
│   ├── storage.ts        # GCS upload/download helpers
│   └── notifications.ts  # Milestone completion emails
├── db/
│   ├── client.ts         # pg Pool connection
│   ├── migrate.ts        # Migration runner
│   ├── migrations/       # 001-006 SQL files
│   └── seeds/dev.sql     # Dev seed data
└── utils/
    ├── validate.ts       # Input validation helpers
    └── response.ts       # Consistent JSON response shape
```

## Auth Model

- Firebase Auth handles all user identity (email/password, JWTs)
- `ADMIN_FIREBASE_UID` env var identifies the admin (you)
- `requireAuth` middleware verifies JWT and sets `req.uid` + `req.role`
- `adminOnly` middleware restricts routes to admin
- Clients can only access their own project data

## Database

6 tables: leads, clients, projects, milestones, messages, files. Migrations run in order via `npm run migrate`. Schema tracks a lead from form submission through client conversion, project delivery, and ongoing communication.

## Frontend Connection

The frontend repo (`agency-frontend`) sends contact form submissions to `POST /leads`. CORS is configured via `FRONTEND_URL` env var.

## Environment Variables

- `DATABASE_URL` — Postgres connection string
- `FIREBASE_PROJECT_ID` — Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT` — stringified JSON service account key
- `GCS_BUCKET` — Cloud Storage bucket name
- `RESEND_API_KEY` — Resend API key
- `PORT` — server port (default: 8080)
- `NODE_ENV` — development or production
- `ADMIN_FIREBASE_UID` — your Firebase UID
- `FRONTEND_URL` — frontend origin for CORS (default: http://localhost:4321)
