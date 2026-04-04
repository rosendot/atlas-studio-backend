# Agency Backend

Node.js + Express REST API for the agency. Handles leads, client auth, project tracking, messaging, and file sharing. Deployed on Google Cloud Run.

## Setup

```bash
npm install
cp .env.example .env.local    # fill in your values
npm run dev                    # http://localhost:8080
```

## Database

```bash
npm run migrate    # run all migrations
npm run seed       # insert dev seed data
```

## Build & Deploy

```bash
npm run build      # compile TypeScript to dist/
npm start          # run production build

# Docker (for Cloud Run)
docker build -t agency-backend .
docker run -p 8080:8080 --env-file .env.local agency-backend
```

## API Routes

### Public
- `POST /leads` — contact form submission

### Admin (Firebase JWT required)
- `GET /leads` — list all leads
- `PATCH /leads/:id` — update lead status
- `POST /auth/invite` — convert lead to client
- `GET /clients` — list all clients
- `GET /projects` — list all projects
- `POST /projects` — create project
- `PATCH /projects/:id` — update project
- `POST /milestones` — create milestone
- `PATCH /milestones/:id` — update milestone

### Client (Firebase JWT required, own project only)
- `GET /projects` — view their projects
- `GET /projects/:id` — view project details
- `GET /milestones?project_id=xxx` — view milestones
- `GET /messages?project_id=xxx` — view messages
- `POST /messages` — send message
- `GET /files?project_id=xxx` — list files
- `GET /files/:id/download` — get download URL
- `POST /files` — upload file