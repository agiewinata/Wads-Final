# Final Project – Web Application Development and Security

**Course Code:** COMP6703001  
**Course Name:** Web Application Development and Security  
**Institution:** BINUS University International

---

# 1. Project Information

## Project Title

Quest Class

## Project Domain

Study Planner & Productivity Tracker

## Class

L4AC

## Group Members

| Name     | Student ID | Role                    | GitHub Username |
| -------- | ---------- | ----------------------- | --------------- |
| Agie Winata | 2902642726   | AI, Security, and Backend Developer | agiewinata        |
| Andres Winson | 2802501123   |Frontend and Backend Developer, and Tester        | Smurfhvr8ght        |
| Irene Angelina | 2802501060   | Frontend Developer, and Tester | LittleDuckTape        |

---

# 2. Instructor & Repository Access

This repository is shared with:

- Instructor: Ida Bagus Kerthyayana Manuaba
    - Email: imanuaba@binus.edu
    - GitHub: bagzcode
- Instructor Assistant: Juwono
    - Email: juwono@binus.edu
    - GitHub: Juwono136

---

# 3. Project Overview

## 3.1 Problem Statement

Many students often struggle to keep track of their tasks and assignments. In addition to procrastination from being overwhelmed with the quantity of work. While there are methods to help with this issue, most of these solutions only offer aid to alleviate one facet of the issue. Students who use these apps have to juggle between multiple apps which may increase their workload instead.

This project aims to solve this issue by providing a centralized platform for students to organize their academic activities and to help improve their productivity

### Target Users

* University students
* High school students
* Self-learners
* Productivity-focused users

## 3.2 Solution Overview

The Study Planner & Productivity Tracker is a full-stack productivity web application that combines task management, calendar scheduling, Pomodoro focus sessions, productivity analytics, and AI-powered study assistance into a single platform.

The application helps users organize their academic responsibilities, track study progress, and receive intelligent recommendations to improve productivity.

### Main Features

* Task Management
* Calendar & Events
* Pomodoro Timer
* Analytics Dashboard
* AI Study Assistant
* Authentication System
* Dragable Dashboard Widgets

### AI Features

* AI Chat Assistant
* Burnout Detection
* Personalized Productivity Recommendations
* Daily AI Affirmations

---

# 4. Technology Stack

| Layer            | Technology         |
| ---------------- | ------------------ |
| Frontend         | Next.js 16         |
| Backend          | Next.js API Routes |
| API              | REST API           |
| Database         | PostgreSQL (Neon) / Firebase (for auth only)  |
| ORM              | Prisma             |
| Authentication   | Better Auth        |
| AI Integration   | Ollama             |
| Styling          | Tailwind CSS       |
| Testing          | Jest               |
| Containerization | Docker             |
| Deployment       | BINUS Server       |
| Version Control  | GitHub             |

---

# 5. System Architecture

## 5.1 Architecture Diagram

```
┌─────────────────────────────────────────────┐
│              Next.js App Router             │
│                                             │
│  app/                                       │
│  ├── (auth)/          # Login, register,    │
│  │                    # forgot password     │
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
          │                         │
   ┌──────▼──────┐         ┌────────▼────────┐
   │  Neon (PG)  │         │  Ollama (LLM)   │
   │  via Prisma │         │  llama3.1:8b    │
   └─────────────┘         └─────────────────┘
```


## 5.2 Architecture Explanation

The application follows a three-layer architecture consisting of the frontend, backend API, and database.

Users interact with the Next.js frontend, which communicates with REST API endpoints. The API layer handles business logic and accesses PostgreSQL through Prisma ORM.

AI-related requests are processed through Ollama models, which generate chat responses, burnout assessments, productivity recommendations, and daily affirmations.

Security controls such as authentication, authorization, input validation, CSRF protection, and rate limiting are enforced before requests reach the database.

---

# 6. API Design

## 6.1 API Endpoints

| Method | Endpoint                | Description                                                                              | Auth Required |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------- | ------------- |
| GET    | /api/tasks              | Retrieve all tasks and support category filtering                                        | Yes           |
| POST   | /api/tasks              | Create a new task                                                                        | Yes           |
| PATCH  | /api/tasks/{id}         | Update an existing task                                                                  | Yes           |
| DELETE | /api/tasks/{id}         | Delete a task                                                                            | Yes           |
| GET    | /api/categories         | Retrieve all categories                                                                  | Yes           |
| POST   | /api/categories         | Create a new category                                                                    | Yes           |
| DELETE | /api/categories/{id}    | Delete a category and remove category references from related tasks                      | Yes           |
| GET    | /api/events             | Retrieve all calendar events                                                             | Yes           |
| POST   | /api/events             | Create a new event                                                                       | Yes           |
| PATCH  | /api/events/{id}        | Update an existing event                                                                 | Yes           |
| DELETE | /api/events/{id}        | Delete an event                                                                          | Yes           |
| GET    | /api/analytics          | Retrieve task statistics and productivity analytics                                      | Yes           |
| POST   | /api/ai/chat            | Generate AI chat responses                                                               | Yes           |
| POST   | /api/ai/assess          | Perform burnout assessment or generate daily affirmations                                | Yes           |
| POST   | /api/ai/recommendations | Generate personalized productivity recommendations                                       | Yes           |
| POST   | /api/ai/upload          | Upload PDF or text files for AI-assisted study support                                   | Yes           |
| GET    | /api/docs               | Retrieve OpenAPI specification documentation                                             | No            |
| *      | /api/auth/*             | Authentication endpoints including login, registration, password reset, and Google OAuth | No            |

## 6.2 API Documentation

### Swagger Documentation

https://e2526-wads-b4ac-05.csbihub.id/api-docs

### OpenAPI Specification

GET /api/docs

### Example Request

```json
{
  "title": "Finish Assignment",
  "priority": "P1"
}
```

### Example Response

```json
{
  "success": true,
  "message": "Task created successfully"
}
```

---

# 7. Database Design

## 7.1 Database Choice

The project uses PostgreSQL hosted on Neon and managed through Prisma ORM.

PostgreSQL was selected because it provides strong relational database support, reliability, scalability, and seamless integration with Prisma.

## 7.2 Schema / Data Structure

Core Entities:

* User
* Task
* Event
* UserCategory
* Session
* Account
* Verification

![ERD](docs/ERD.png)

---

# 8. AI Features

## 8.1 AI Feature List

| AI Feature                   | Purpose                                    | AI Type        |
| ---------------------------- | ------------------------------------------ | -------------- |
| AI Chat Assistant            | Study assistance and productivity guidance | LLM/ Generative AI           |
| Burnout Detection            | Workload analysis                          | LLM/ Rule Based            |
| Productivity Recommendations | Personalized study suggestions             | LLM/ Generative AI |
| Daily Affirmation Generator  | Motivation and encouragement               | LLM/ Rule Based           |

## 8.2 AI Integration Flow

**AI Chat Assistant:** 

User input(text and/or pdf file) -> send to Ollama API -> generate response -> display to user

**Burnout Detection, Productivity Recommendations, Daily Affirmation Generator:** 

system compile user task data -> send to Ollama API -> generate response -> display to user

---

# 9. Security Implementation

### 9.1. Authentication & Session Management

**Implementation:** Better-Auth v1.6.11 with server-side session validation.

* Every protected API route calls `auth.api.getSession()` and returns `401 Unauthorized` if no valid session is found.
* Sessions are stored server-side. Clients only holds a signed, HttpOnly session cookie.
* Passwords are hashed using bcryptjs before storage — plaintext passwords are never persisted.
* Google OAuth is available as a passwordless sign-in option.

**Relevant files:** `lib/auth.ts`, `app/api/auth/[...all]/route.ts`

### 9.2. Authorization — Resource Ownership Checks

* Every endpoint that reads, updates, or deletes a resource verifies user ownership.
* Returning `404` instead of `403` avoids revealing whether a resource exists to another user (IDOR prevention).

**Relevant files:** `app/api/tasks/[id]/route.ts`, `app/api/events/[id]/route.ts`, `app/api/categories/[id]/route.ts`

### 9.3. CSRF Protection (Double-Submit Cookie)

**Implementation:** `proxy.ts` (Next.js middleware)

* All mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require a valid CSRF token.
* The middleware compares the token stored in the cookie with the token sent in the `x-csrf-token` header.
* Invalid or missing tokens result in a `403 Forbidden` response.
* Tokens are generated using `crypto.randomUUID()` and sent through `csrfFetch()`.

**Relevant files:** `proxy.ts`, `lib/csrf-client.ts`

### 9.4. Security Headers

Applied to every response through middleware:

| Header                  | Purpose                             |
| ----------------------- | ----------------------------------- |
| Content-Security-Policy | Helps prevent XSS and clickjacking  |
| X-Frame-Options         | Prevents iframe embedding           |
| X-Content-Type-Options  | Prevents MIME-type sniffing         |
| Referrer-Policy         | Limits referrer information leakage |
| Permissions-Policy      | Disables unnecessary browser APIs   |

### 9.5. Rate Limiting

**Implementation:** In-process sliding-window rate limiter.

* AI endpoints are limited to 20 requests per minute.
* File upload endpoints are limited to 10 requests per minute.
* Exceeding limits returns `429 Too Many Requests`.

**Relevant files:** `lib/rate-limit.ts`, `app/api/ai/*/route.ts`

### 9.6. Input Validation (Zod)

* All request bodies are validated using Zod schemas.
* Ensures fields, data types, dates, and lengths are valid.
* Invalid requests return `400 Bad Request` with validation errors.

**Relevant files:** All `app/api/*/route.ts` files

### 9.7. Input Sanitization (XSS Prevention)

**Implementation:** `lib/sanitize.ts`

* Removes `<script>` tags and their contents.
* Removes HTML/XML tags.
* Removes dangerous URI schemes such as `javascript:` and `data:`.
* Executable input by users are not run by application.

**Relevant files:** `lib/sanitize.ts`, `app/api/tasks/route.ts`, `app/api/events/route.ts`, `app/api/categories/route.ts`

### 9.8. SQL Injection Prevention

* Uses Prisma ORM for all database operations.
* Prisma automatically generates parameterized queries.
* No raw SQL (`$queryRaw`) is used in the application.

### 9.9. Sensitive Data Handling

* `.env` files are excluded using `.gitignore`.
* API keys, database credentials, and secrets are stored in environment variables.
* GitHub Actions Secrets are used for deployment and CI/CD credentials.


---

# 10. Testing Documentation

### 10.1 Frontend Testing

| Test Case | Scenario | Expected Result | Status |
|-----------|-----------|----------------|--------|
| FE-01 | User login with valid credentials | User is redirected to dashboard | ✅ Pass |
| FE-02 | User login with invalid credentials | Error message displayed and login denied | ✅ Pass |
| FE-03 | Create a new task | Task appears in task list | ✅ Pass |
| FE-04 | Edit an existing task | Updated task information is displayed | ✅ Pass |
| FE-05 | Delete a task | Task is removed from task list | ✅ Pass |
| FE-06 | Create an event | Event appears on calendar | ✅ Pass |
| FE-07 | Dashboard analytics display | Statistics and charts load correctly | ✅ Pass |
| FE-08 | AI chat interaction | AI response is displayed correctly | ✅ Pass |

### 10.2 Backend & API Testing

| Test Case | Endpoint | Input | Expected Output | Status |
|-----------|----------|-------|----------------|--------|
| API-01 | `/api/tasks` | Valid task data | Task created successfully | ✅ Pass |
| API-02 | `/api/tasks/{id}` | Updated task data | Task updated successfully | ✅ Pass |
| API-03 | `/api/tasks/{id}` | Valid task ID | Task deleted successfully | ✅ Pass |
| API-04 | `/api/events` | Valid event data | Event created successfully | ✅ Pass |
| API-05 | `/api/events/{id}` | Updated event data | Event updated successfully | ✅ Pass |
| API-06 | `/api/events/{id}` | Valid event ID | Event deleted successfully | ✅ Pass |
| API-07 | `/api/categories` | Valid category data | Category created successfully | ✅ Pass |
| API-08 | `/api/ai/chat` | User prompt | AI response returned | ✅ Pass |
| API-09 | `/api/ai/recommendations` | User productivity data | Recommendations generated | ✅ Pass |
| API-10 | `/api/ai/upload` | Valid PDF file | Text extracted successfully | ✅ Pass |
| API-11 | `/api/ai/upload` | Corrupted PDF file | Returns `422 Could Not Parse PDF` | ✅ Pass |

### 10.3 Security Testing

| Test Case | Attack Type | Expected Behavior | Result |
|-----------|------------|------------------|--------|
| SEC-01 | Unauthorized Access | Returns `401 Unauthorized` | ✅ Pass |
| SEC-02 | IDOR (Access Other User's Resource) | Returns `404 Not Found` | ✅ Pass |
| SEC-03 | Missing CSRF Token | Returns `403 Forbidden` | ✅ Pass |
| SEC-04 | Invalid CSRF Token | Returns `403 Forbidden` | ✅ Pass |
| SEC-05 | XSS (`<script>alert(1)</script>`) | Input sanitized before storage | ✅ Pass |
| SEC-06 | XSS (`<img onerror=alert(1)>`) | HTML tags removed | ✅ Pass |
| SEC-07 | SQL Injection (`' OR '1'='1`) | Stored safely as plain text | ✅ Pass |
| SEC-08 | SQL Injection (`DROP TABLE`) | Database remains unaffected | ✅ Pass |
| SEC-09 | Invalid Input Data | Returns `400 Bad Request` | ✅ Pass |
| SEC-10 | Rate Limit Abuse | Returns `429 Too Many Requests` | ✅ Pass |
| SEC-11 | Clickjacking Attempt | Blocked by security headers | ✅ Pass |

### 10.4 AI Functionality Testing

#### AI Feature: AI Chat Assistant

| Test Case | Input | Expected Output | Actual Result | Status |
|-----------|--------|----------------|--------------|--------|
| AI-01 | Valid study-related question | Relevant AI response generated | Correct response returned | ✅ Pass |
| AI-02 | Empty or invalid input | Error message returned | Error handled correctly | ✅ Pass |
| AI-03 | Prompt injection attempt | System prompt remains protected | Injection attempt ignored | ✅ Pass |

#### AI Feature: Burnout Assessment & Daily Affirmation

| Test Case | Input | Expected Output | Actual Result | Status |
|-----------|--------|----------------|--------------|--------|
| AI-04 | Valid burnout assessment request | Burnout analysis returned | Assessment generated correctly | ✅ Pass |
| AI-05 | Valid affirmation request | Positive affirmation returned | Affirmation generated correctly | ✅ Pass |
| AI-06 | Invalid request type | Error message returned | Error handled correctly | ✅ Pass |

#### AI Feature: Productivity Recommendations

| Test Case | Input | Expected Output | Actual Result | Status |
|-----------|--------|----------------|--------------|--------|
| AI-07 | User productivity data | Personalized recommendations generated | Recommendations returned correctly | ✅ Pass |
| AI-08 | Missing or invalid input | Error message returned | Error handled correctly | ✅ Pass |
| AI-09 | Prompt injection attempt | System instructions preserved | Injection attempt ignored | ✅ Pass |

#### AI Feature: PDF Context Upload

| Test Case | Input | Expected Output | Actual Result | Status |
|-----------|--------|----------------|--------------|--------|
| AI-10 | Valid PDF document | Text extracted successfully | Text returned correctly | ✅ Pass |
| AI-11 | Corrupted PDF file | Parsing error returned | Returns `422 Could Not Parse PDF` | ✅ Pass |
| AI-12 | Unsupported file type | Validation error returned | Error handled correctly | ✅ Pass |

### Failure Handling

* Unauthorized access handling (401 responses)
* AI service unavailable handling (502 responses)
* AI non-success response handling (502 responses)
* Missing file upload validation
* File size limit validation (10 MB)
* Corrupted PDF parsing error handling
* Invalid AI response fallback handling
* Large document truncation and processing limits

---

# 11. Deployment & Production Setup

## 11.1 Docker Setup

* Dockerfile Included
* Docker Compose Included

## 11.2 Production Environment

### Secrets Handling

Sensitive credentials are stored as environment variables and are not committed to GitHub.

### HTTPS Configuration

The application is deployed behind HTTPS using the university server infrastructure.

## 11.3 Live Application URL

https://e2526-wads-b4ac-05.csbihub.id

---

# 12. GitHub Contribution Summary

## Student Name: Agie Winata

### Features Implemented
* AI Chatbot
* To-Do List
* Analytics
* Daily check-in and Burnout safeguard
* Docker and Deployment
* Ci/Cd Pipiline for github action

### API Endpoints Handled
* GET /api/auth/[...all] 
* POST /api/auth/[...all] 
* GET /api/tasks 
* POST /api/tasks
* PATCH /api/tasks/{id} 
* DELETE /api/tasks/{id} 
* GET /api/events
* POST /api/events
* PATCH /api/events/{id} 
* DELETE /api/events/{id} 
* GET /api/categories 
* POST /api/categories 
* DELETE /api/categories/{id} 
* GET /api/analytics 
* POST /api/ai/chat 
* POST /api/ai/recommendations 
* POST /api/ai/upload 
* POST /api/ai/assess 
* GET /api/health 
* GET /api/docs 


### Tests Written
* AI Assess 
* AI Chat
* AI Recommendations
* AI Upload 
* Categories 
* Events List 
* Event by ID 
* Tasks List
* Task by ID 

### Security Work

* Zod schema validation at API boundaries 
* Input sanitisation
* Tiered rate limiting 
* CSRF protection on mutating requests 
* Secure session configuration
 
### AI Related Work

* Burnout Detectio
* Daily Affirmations
* Streaming AI Chat
* File Upload for AI Context

## Student Name: Andres Winson

### Features Implemented
* Dashboard Page
* Calendar Page
* Dashboard Widget Components

### API Endpoints Handled
- GET /api/events
- POST /api/events
- PATCH /api/events/{id}
- DELETE /api/events/{id}

### Tests Written
* Tested Widget in dashboard is responsive and is properly displayed
* Tested Dashboard UI dragability
* Confirmed Calendar display is proper and is showing tasks and events
* Tested task creation, editing, and deletion for events

### Security Work
* Implemented event ownerships validation
* Preventing other users from accessing or modifying events owned by other users
* Validation for event API using Zod schema
* Input Sanitization for event creation

## Student Name: Irene Angelina

### Features Implemented
- Focus Session timer
- Short Break Timer
- Long break timer
- Start, Pause, Resume, and Reset controls
- Circular progress indicator
- Customizable timer durations (via timer settings)
- Long break interval configuration (via timer settings)
- Auto-start breaks option (in timer settings)
- Timer completion popup notifications
- Audio alerts when sessions end
- Timer persistence across page navigation (basically timer runs in the background)
- Saved user timer settings

### Tests Written
- Tested timer countdown accuracy
- Tested focus, short break, and long break modes
- Tested timer settings persistence
- Tested notification functionality
- Tested auto-start break functionality
- Tested page navigation persistence
- Tested task creation, editing, and deletion
- Tested calendar event creation
- Tested task due date synchronization with calendar
- Tested dashboard widgets
- Tested dashboard drag-and-drop customization
- Tested AI chatbot functionality
- Tested general application navigation and integration

---

# 13. AI Usage Disclosure

### AI Tools Used

* ChatGPT
* Ollama
* Claude

### Purpose of Usage

* Code assistance
* Debugging assistance
* AI feature implementation
* Testing scenario generation

### Assisted Components

* Backend API development
* AI integration
* Documentation assistance

---

# 14. Known Limitations & Future Improvements

## Current Limitations

* Requires Ollama availability
* AI recommendations depend on available user data

## Future Improvements

* Mobile application
* Team collaboration support
* More advanced scheduling algorithms

## AI Risks & Limitations

* AI responses may be inaccurate
* Recommendations should be treated as suggestions

---

# 15. Final Declaration

We declare that:

* This project is our own work.
* AI usage has been disclosed honestly.
* All group members understand the system.

Signed by Group Members:

* Agie Winata
* Andres Winson
* Irene Angelina

---

# 16. Setup

```bash
git clone https://github.com/agiewinata/Wads-Final

cd Wads-Final

npm install

npm run dev
```

---

# 17. Deployment Instructions

```bash
docker compose up --build -d
```

### Manual Deployment

```bash
git pull origin Main

docker compose down

docker compose up --build -d
```

---

# 18. Video Link

Project Demo: https://youtu.be/zGk_CcabO64 
