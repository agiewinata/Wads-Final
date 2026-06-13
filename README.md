# Study Planner & Productivity Tracker

> COMP6703001 — Web Application Development and Security
> BINUS University International · 2025/2026

A full-stack productivity web application that helps students manage tasks, track events, run Pomodoro focus sessions, visualise progress through analytics, and get personalised AI-powered study support — all in one place.

**Live deployment:** https://e2526-wads-b4ac-05.csbihub.id
**API docs (Swagger UI):** https://e2526-wads-b4ac-05.csbihub.id/docs

---

## Table of Contents

1. [Team Members](#team-members)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Running the App](#running-the-app)
8. [Running Tests](#running-tests)
9. [Docker](#docker)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [API Reference](#api-reference)
12. [Security](#security)
13. [Deployment](#deployment)

---

## Team Members

| Name | Student ID | Role |
|------|-----------|------|
| _(member 1)_ | _(ID)_ | _(role)_ |
| _(member 2)_ | _(ID)_ | _(role)_ |
| _(member 3)_ | _(ID)_ | _(role)_ |

---

## Features

### Task Management
- Create, edit, and delete tasks with a **title**, **details**, **priority level** (P1–P5), **due date**, and **category**
- Mark tasks as complete and filter by status (Active / Completed / Overdue)
- Sort tasks by due date or priority
- Bulk-select and delete tasks
- Category filter sidebar

### Calendar & Events
- Create, edit, and delete calendar events with a start date, optional end date, and category
- Full calendar view (month/week/day) powered by `react-big-calendar`
- Events displayed alongside tasks in the dashboard mini-calendar

### Pomodoro Timer
- Configurable focus (default 25 min), short break (5 min), and long break (15 min) durations
- Auto-start breaks toggle
- Animated circular progress ring with smooth rewind animation on session completion
- Desktop notifications and audio alarm on timer completion
- Settings persisted to `localStorage` per user

### Analytics Dashboard
- Summary cards: total tasks, completed, overdue, due soon, completion rate
- Configurable date range (7d / 14d / 30d / 90d / 180d)
- **Trend chart** — daily/weekly line chart of tasks created, completed, and overdue
- **Category breakdown** — bar chart showing completion rate per category
- **Priority breakdown** — bar chart showing completion by priority level
- AI-generated productivity recommendations alongside the charts

### AI Study Assistant

| Feature | Description |
|---------|-------------|
| **Chat** | Streaming chat with Ollama LLM. The model receives your real-time task snapshot (overdue, due soon, active, completed) as context so responses are relevant to your workload |
| **Vision** | Attach images to chat messages — switches automatically to the `gemma4:e4b` vision model |
| **File upload** | Upload PDFs or `.txt` files (max 10 MB) to inject document content into the conversation as study material |
| **Burnout check** | Runs before creating a new task; the LLM assesses current workload against configurable thresholds and surfaces a warning when needed |
| **Daily affirmation** | Shown once per day on first login; a personalised motivational message generated from the student's name and task stats |
| **Recommendations** | On-demand panel on the analytics page; returns 3–4 personalised productivity tips |

### Authentication
- Email + password sign-up and sign-in
- Google OAuth sign-in
- Forgot-password email flow (via Resend)
- Secure server-side sessions managed by Better-Auth

### Dashboard
- Draggable, resizable widget grid (react-grid-layout)
- Profile card, mini-calendar, Pomodoro timer, and AI recommendations widgets

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.2.6 (App Router, React Server Components) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Database** | PostgreSQL via [Neon](https://neon.tech) serverless |
| **ORM** | Prisma 7.8.0 with `@prisma/adapter-neon` |
| **Auth** | Better-Auth 1.6.11 (session cookies, Google OAuth) |
| **AI / LLM** | Ollama (`llama3.1:8b` text, `gemma4:e4b` vision) |
| **Email** | Resend (password-reset emails) |
| **Charts** | Recharts |
| **Calendar** | react-big-calendar |
| **Validation** | Zod |
| **Containerisation** | Docker + Docker Compose |
| **CI/CD** | GitHub Actions |
| **Testing** | Jest + ts-jest |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Next.js App Router              │
│                                             │
│  app/                                       │
│  ├── (auth)/          # Login, register,    │
│  │                    # forgot password      │
│  ├── dashboard/       # All dashboard pages │
│  │   ├── page.tsx     # Widget grid         │
│  │   ├── tasks/       # Task manager        │
│  │   ├── calendar/    # Full calendar       │
│  │   ├── timer/       # Pomodoro timer      │
│  │   ├── analytics/   # Charts + AI recs    │
│  │   └── ai/          # AI chat             │
│  └── api/             # REST API routes     │
│      ├── tasks/                             │
│      ├── events/                            │
│      ├── categories/                        │
│      ├── analytics/                         │
│      ├── ai/{chat,assess,recs,upload}       │
│      ├── auth/[...all]  # Better-Auth       │
│      └── docs/          # OpenAPI spec      │
│                                             │
│  lib/          # auth, prisma, csrf, etc.   │
│  proxy.ts      # Middleware: CSRF + headers │
└──────────────────────┬──────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                        │
   ┌──────▼──────┐        ┌────────▼────────┐
   │  Neon (PG)  │        │  Ollama (LLM)   │
   │  via Prisma │        │  llama3.1:8b    │
   └─────────────┘        └─────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later
- **Docker** & **Docker Compose** (for containerised setup)
- A **Neon** PostgreSQL connection string (or any PostgreSQL database)
- **Ollama** running locally or at a reachable URL with `llama3.1:8b` pulled

### Installation

```bash
git clone https://github.com/agiewinata/Wads-Final.git
cd Wads-Final
npm install
```

---

## Environment Variables

Create a `.env` file at the project root. All variables are required unless marked optional.

```env
# ── Database ────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# ── Better-Auth ─────────────────────────────────────────────────
BETTER_AUTH_SECRET=your-32-char-minimum-secret-here
BETTER_AUTH_URL=http://localhost:3000

# ── Google OAuth (optional — disables Google sign-in if absent) ─
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ── Ollama ──────────────────────────────────────────────────────
OLLAMA_BASE=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# ── Resend (optional — disables password-reset email if absent) ─
RESEND_API_KEY=re_your_resend_api_key

# ── Firebase (optional — push notifications) ────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

> `.env` is in `.gitignore` and is **never** committed to the repository.

---

## Running the App

### Local development

```bash
# 1. Apply database migrations
npx prisma migrate deploy

# 2. Generate the Prisma client
npx prisma generate

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js in development mode with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint (zero warnings policy) |
| `npm test` | Run all Jest tests |

---

## Running Tests

The project uses **Jest** with **ts-jest** for unit and integration testing of all API routes. Tests mock Prisma and Better-Auth — no database connection is required.

```bash
# Run all tests
npm test

# Run a specific test suite
npx jest __tests__/api/tasks/tasks.test.ts

# Run in watch mode
npx jest --watch
```

### Test coverage

| Suite | File | Tests |
|-------|------|-------|
| Tasks — list & create | `__tests__/api/tasks/tasks.test.ts` | 12 |
| Tasks — update & delete | `__tests__/api/tasks/task-id.test.ts` | 11 |
| Categories — CRUD | `__tests__/api/categories/categories.test.ts` | 12 |
| Events — list & create | `__tests__/api/events/events.test.ts` | 11 |
| Events — update & delete | `__tests__/api/events/event-id.test.ts` | 11 |
| AI chat | `__tests__/api/ai/chat.test.ts` | _(included)_ |
| AI assess (burnout/affirmation) | `__tests__/api/ai/assess.test.ts` | _(included)_ |
| AI recommendations | `__tests__/api/ai/recommendations.test.ts` | _(included)_ |
| AI file upload | `__tests__/api/ai/upload.test.ts` | _(included)_ |
| **Total** | | **89 tests · 9 suites** |

Each suite covers: unauthenticated access (401), resource not found (404), ownership enforcement, input validation (400), and happy-path success responses.

---

## Docker

### Build and run with Docker Compose

```bash
# Build the image and start the container
docker compose up --build -d

# View logs
docker compose logs -f web

# Stop
docker compose down
```

The app runs on port **3000** inside the container. `docker-compose.yml` reads environment variables from a `.env.production` file on the host.

### Multi-stage Dockerfile

The `Dockerfile` uses a three-stage build:

1. **deps** — installs production `node_modules`
2. **builder** — runs `next build` to produce the standalone output
3. **runner** — copies only the standalone artefacts for a minimal production image

---

## CI/CD Pipeline

GitHub Actions runs on every push and pull request to `Main`.

```
push / PR to Main
        │
        ├──▶ Lint          eslint . --max-warnings 0
        │
        ├──▶ Run Tests     jest --ci --forceExit (mocked deps, no DB needed)
        │        │
        │        └──▶ Docker Build   validates Dockerfile compiles successfully
        │                   │
        │                   └──▶ Deploy (push to Main only)
        │                          SSH → git pull → docker compose up --build -d
        │                          health check GET /api/health
        └──────────────────────────────────────────────────────────────────────
```

### Jobs

| Job | Runs on | Description |
|-----|---------|-------------|
| **Lint** | Every push/PR | ESLint with zero-warnings policy |
| **Run Tests** | Every push/PR | All 89 Jest tests with mocked dependencies |
| **Docker Build** | After tests pass | Validates the production Docker image builds |
| **Deploy** | Push to `Main` only | SSH deploy to the university production server |

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Production server IP address |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_PASSWORD` | SSH password |
| `DEPLOY_PORT` | SSH port (typically `22`) |
| `DEPLOY_PATH` | Absolute path to the app directory on the server |
| `DEPLOY_URL` | Public URL used for the post-deploy health check |

---

## API Reference

Interactive documentation is available at **`/docs`** (Swagger UI) on the running app.
The raw OpenAPI 3.0 spec is served at `GET /api/docs`.

### Endpoints summary

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/tasks` | ✅ | List tasks (filter by `?category=`) |
| `POST` | `/api/tasks` | ✅ | Create a task |
| `PATCH` | `/api/tasks/{id}` | ✅ | Partially update a task |
| `DELETE` | `/api/tasks/{id}` | ✅ | Delete a task |
| `GET` | `/api/categories` | ✅ | List categories |
| `POST` | `/api/categories` | ✅ | Create a category |
| `DELETE` | `/api/categories/{id}` | ✅ | Delete a category (nullifies linked tasks) |
| `GET` | `/api/events` | ✅ | List events |
| `POST` | `/api/events` | ✅ | Create an event |
| `PATCH` | `/api/events/{id}` | ✅ | Partially update an event |
| `DELETE` | `/api/events/{id}` | ✅ | Delete an event |
| `GET` | `/api/analytics` | ✅ | Task statistics and trend data |
| `POST` | `/api/ai/chat` | ✅ | Streaming AI chat (plain-text response) |
| `POST` | `/api/ai/assess` | ✅ | Burnout check or daily affirmation |
| `POST` | `/api/ai/recommendations` | ✅ | AI productivity recommendations |
| `POST` | `/api/ai/upload` | ✅ | Upload PDF/text file for AI context |
| `GET` | `/api/docs` | ❌ | OpenAPI 3.0 spec (JSON) |
| `*` | `/api/auth/*` | ❌ | Better-Auth — login, register, OAuth, etc. |

All protected endpoints return `401 Unauthorized` without a valid session and `403 Forbidden` when the CSRF token is missing on mutating requests.

---

## Security

See [SECURITY.md](SECURITY.md) for the full security documentation including implementation details and 23 manual test results.

### Summary of security measures

| Measure | Implementation |
|---------|---------------|
| **Authentication** | Better-Auth — server-side sessions, bcryptjs password hashing |
| **Authorization** | Per-request ownership check on every resource; returns 404 to prevent IDOR enumeration |
| **CSRF protection** | Double-submit cookie pattern enforced in middleware for all mutating API requests |
| **Security headers** | CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| **Rate limiting** | Sliding-window limiter — 20 req/min (AI chat/assess/recs), 10 req/min (file upload) |
| **Input validation** | Zod schemas on every mutation endpoint |
| **Input sanitization** | `sanitizeText()` strips `<script>` blocks, HTML tags, and `javascript:`/`data:` URIs before storage |
| **SQL injection** | Prisma ORM — parameterised queries only, no raw SQL |
| **Secrets management** | All credentials in `.env` (gitignored); injected at runtime via environment variables |

---

## Deployment

The app is deployed on a BINUS University server using Docker Compose.

### Manual deployment (from within the university network)

```bash
ssh usergc26@<server-ip>
cd ~/wads-final
git pull origin Main
docker compose down
docker compose up --build -d
```

### Production environment

- The server runs the Next.js standalone build inside Docker
- Environment variables are loaded from `.env.production` on the host
- The application is accessible via the university reverse proxy at `https://e2526-wads-b4ac-05.csbihub.id`
