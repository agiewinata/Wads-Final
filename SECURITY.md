# Security Documentation

## Overview

This document describes the security measures implemented in the WADS Study Planner & Productivity Tracker application, and the results of manual security testing performed against the deployed application.

---

## Security Measures Implemented

### 1. Authentication & Session Management

**Implementation:** Better-Auth v1.6.11 with server-side session validation.

- Every protected API route calls `auth.api.getSession()` and returns `401 Unauthorized` if no valid session is found.
- Sessions are stored server-side; the client only holds a signed, HttpOnly session cookie.
- Passwords are hashed using **bcryptjs** before storage — plaintext passwords are never persisted.
- Google OAuth is available as a passwordless sign-in option.

**Relevant files:** `lib/auth.ts`, `app/api/auth/[...all]/route.ts`

---

### 2. Authorization — Resource Ownership Checks

Every endpoint that reads, updates, or deletes a resource verifies that the authenticated user owns it:

```ts
const existing = await prisma.task.findUnique({ where: { id } });
if (!existing || existing.userId !== session.user.id) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

Returning `404` instead of `403` intentionally avoids revealing whether a resource exists to a different user (IDOR prevention).

**Relevant files:** `app/api/tasks/[id]/route.ts`, `app/api/events/[id]/route.ts`, `app/api/categories/[id]/route.ts`

---

### 3. CSRF Protection (Double-Submit Cookie)

**Implementation:** `proxy.ts` (Next.js middleware)

On every mutating request (`POST`, `PUT`, `PATCH`, `DELETE`) to any `/api/*` route (except `/api/auth`), the middleware validates a CSRF double-submit cookie:

```ts
const cookieToken = req.cookies.get("csrf-token")?.value;
const headerToken = req.headers.get("x-csrf-token");
if (!cookieToken || !headerToken || cookieToken !== headerToken) {
  return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
}
```

The CSRF token is a `crypto.randomUUID()` set as a non-HttpOnly cookie (so JavaScript can read it) and sent back on every mutating request via the `x-csrf-token` header using `csrfFetch()` (`lib/csrf-client.ts`).

**Relevant files:** `proxy.ts`, `lib/csrf-client.ts`

---

### 4. Security Headers

Applied to every response via `proxy.ts` middleware:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'; frame-ancestors 'none'; ...` | Blocks XSS via injected scripts, prevents clickjacking |
| `X-Frame-Options` | `DENY` | Prevents iframe embedding (clickjacking) |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer data leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unnecessary browser APIs |

---

### 5. Rate Limiting

**Implementation:** In-process sliding-window rate limiter (`lib/rate-limit.ts`)

Applied per authenticated user ID on all AI endpoints:

| Tier | Routes | Limit |
|------|--------|-------|
| `ai` | `/api/ai/chat`, `/api/ai/assess`, `/api/ai/recommendations` | 20 requests / minute |
| `upload` | `/api/ai/upload` | 10 requests / minute |

Exceeding the limit returns `429 Too Many Requests`.

**Relevant files:** `lib/rate-limit.ts`, `app/api/ai/*/route.ts`

---

### 6. Input Validation (Zod)

All mutation endpoints validate request bodies using **Zod schemas** before touching the database:

- Required fields enforced (e.g. `title: z.string().min(1)`)
- Type checking (e.g. `priority: z.number().int().min(1).max(5)`)
- Date format validation (`z.string().datetime()`)
- Length limits (e.g. category name `z.string().max(32)`)

Invalid input returns `400 Bad Request` with structured field errors.

**Relevant files:** All `app/api/*/route.ts` files

---

### 7. Input Sanitization (XSS Prevention)

**Implementation:** `lib/sanitize.ts` applied at every write boundary.

`sanitizeText()` strips:
- `<script>` blocks and their content
- All remaining HTML/XML tags
- `javascript:` and `data:` URI schemes

Applied to all text fields (`title`, `details`, `name`) on task, event, and category creation routes before data is persisted. React's JSX escaping provides a second layer at render time.

**Relevant files:** `lib/sanitize.ts`, `app/api/tasks/route.ts`, `app/api/events/route.ts`, `app/api/categories/route.ts`

---

### 8. SQL Injection Prevention

The application uses **Prisma ORM** exclusively for all database access. Prisma uses parameterized queries internally — user-supplied values are never interpolated into raw SQL strings. No raw SQL (`$queryRaw`) is used anywhere in the codebase.

---

### 9. Sensitive Data Handling

- `.env` files are listed in `.gitignore` and never committed to the repository.
- Database credentials, API keys, and secrets are injected via environment variables at runtime.
- GitHub Actions secrets are used for CI/CD — no credentials appear in workflow logs.

---

## Security Testing

Manual security testing was performed against the deployed application at `https://e2526-wads-b4ac-05.csbihub.id`.

### Authentication & Access Control

| # | Test | Method | Expected | Result |
|---|------|--------|----------|--------|
| 1 | Access `/dashboard` without a session | Navigate directly to URL while logged out | Redirect to `/login` | ✅ Pass |
| 2 | Call `GET /api/tasks` without a session cookie | `curl` with no cookie header | `401 Unauthorized` | ✅ Pass |
| 3 | Access another user's task by ID | Authenticated request with a known foreign task ID | `404 Not Found` | ✅ Pass |
| 4 | Access another user's event by ID | Authenticated request with a known foreign event ID | `404 Not Found` | ✅ Pass |
| 5 | Sign in with wrong password | Submit incorrect credentials on login form | Error message, no session created | ✅ Pass |

### CSRF Protection

| # | Test | Method | Expected | Result |
|---|------|--------|----------|--------|
| 6 | `POST /api/tasks` without CSRF header | `curl -X POST` with session cookie but no `x-csrf-token` header | `403 Forbidden` | ✅ Pass |
| 7 | `DELETE /api/tasks/{id}` without CSRF header | Same as above for DELETE | `403 Forbidden` | ✅ Pass |
| 8 | Valid mutating request with correct CSRF token | Normal app usage via `csrfFetch()` | `200`/`201`/`204` | ✅ Pass |

### XSS (Cross-Site Scripting)

| # | Test | Method | Expected | Result |
|---|------|--------|----------|--------|
| 9 | Submit task title containing `<script>alert(1)</script>` | POST `/api/tasks` with XSS payload | Script tags stripped; stored as plain text | ✅ Pass |
| 10 | Submit task details with `<img src=x onerror=alert(1)>` | POST `/api/tasks` with img XSS payload | HTML tags stripped by `sanitizeText()` | ✅ Pass |
| 11 | Submit category name with `javascript:alert(1)` | POST `/api/categories` | `javascript:` prefix stripped | ✅ Pass |
| 12 | Render task title in UI | View task list after storing sanitized payload | No script execution; React escapes output | ✅ Pass |

### SQL Injection

| # | Test | Method | Expected | Result |
|---|------|--------|----------|--------|
| 13 | Submit `' OR '1'='1` as task title | POST `/api/tasks` | Stored as a literal string; Prisma parameterizes it | ✅ Pass |
| 14 | Submit `"; DROP TABLE task; --` as title | POST `/api/tasks` | Stored safely; no database error | ✅ Pass |
| 15 | Submit `1; SELECT * FROM "user"` as category name | POST `/api/categories` | Zod rejects (exceeds 32 chars) or stored safely | ✅ Pass |

### Input Validation

| # | Test | Method | Expected | Result |
|---|------|--------|----------|--------|
| 16 | POST task with no `title` field | `curl` with `{}` body | `400 Bad Request` | ✅ Pass |
| 17 | POST task with `priority: 99` | `curl` with out-of-range priority | `400 Bad Request` | ✅ Pass |
| 18 | POST event with `startDate: "not-a-date"` | Invalid datetime string | `400 Bad Request` | ✅ Pass |
| 19 | POST category with name longer than 32 chars | 33-character string | `400 Bad Request` | ✅ Pass |

### Rate Limiting

| # | Test | Method | Expected | Result |
|---|------|--------|----------|--------|
| 20 | Send 21 rapid POST requests to `/api/ai/chat` | Shell loop: `for i in {1..21}; do curl ... done` | First 20 succeed; 21st returns `429` | ✅ Pass |
| 21 | Send 11 rapid POST requests to `/api/ai/upload` | Shell loop with file upload | First 10 succeed; 11th returns `429` | ✅ Pass |

### Clickjacking & Headers

| # | Test | Method | Expected | Result |
|---|------|--------|----------|--------|
| 22 | Embed app in an `<iframe>` on a third-party page | Create HTML page with `<iframe src="...app-url">` | Browser blocks frame due to `X-Frame-Options: DENY` | ✅ Pass |
| 23 | Inspect response headers | `curl -I https://...app-url/` | `X-Frame-Options`, `X-Content-Type-Options`, `CSP` present | ✅ Pass |

---

## Known Limitations

- **Rate limiter is in-process** — resets on server restart and does not share state across multiple instances. A Redis-backed limiter would be needed for multi-instance deployments.
- **CSP allows `unsafe-eval` and `unsafe-inline`** for scripts — required by Next.js's runtime and Tailwind CSS. A stricter nonce-based CSP is the long-term fix.
- **SSH deployment port is blocked** by the university firewall from public IPs — deployments are performed manually from within the university network.
