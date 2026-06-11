import type { OpenAPIV3 } from "openapi-types";

const spec: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "WADS Task Management API",
    version: "1.0.0",
    description:
      "REST API for the WADS student productivity app. All endpoints except the auth catch-all require an active session cookie issued by Better-Auth.",
  },
  servers: [{ url: "/api", description: "Local / deployed app" }],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description: "Session token set automatically after signing in via /api/auth.",
      },
    },
    schemas: {
      Task: {
        type: "object",
        properties: {
          id:        { type: "string", description: "CUID" },
          userId:    { type: "string" },
          title:     { type: "string" },
          details:   { type: "string", nullable: true },
          priority:  { type: "integer", minimum: 1, maximum: 5, nullable: true },
          dueDate:   { type: "string", format: "date-time", nullable: true },
          category:  { type: "string", nullable: true },
          completed: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Event: {
        type: "object",
        properties: {
          id:        { type: "string" },
          userId:    { type: "string" },
          title:     { type: "string" },
          details:   { type: "string", nullable: true },
          startDate: { type: "string", format: "date-time" },
          dueDate:   { type: "string", format: "date-time", nullable: true },
          category:  { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Category: {
        type: "object",
        properties: {
          id:        { type: "string" },
          userId:    { type: "string" },
          name:      { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          error: {
            type: "object",
            description: "Zod flattened field errors.",
          },
        },
      },
      ErrorMessage: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
  security: [{ sessionCookie: [] }],
  paths: {
    // ─── TASKS ────────────────────────────────────────────────────────────────
    "/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List all tasks",
        description: "Returns the authenticated user's tasks, newest first. Optionally filter by category.",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter tasks by category name.",
          },
        ],
        responses: {
          "200": {
            description: "Array of tasks.",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Task" } },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
      post: {
        tags: ["Tasks"],
        summary: "Create a task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title:    { type: "string", minLength: 1 },
                  details:  { type: "string", nullable: true },
                  priority: { type: "integer", minimum: 1, maximum: 5, nullable: true },
                  dueDate:  { type: "string", format: "date-time", nullable: true },
                  category: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Task created.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } },
          },
          "400": {
            description: "Validation error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },
    "/tasks/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Task ID (CUID)." },
      ],
      patch: {
        tags: ["Tasks"],
        summary: "Update a task",
        description: "Partially update a task. All fields are optional. Ownership is verified.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title:     { type: "string", minLength: 1 },
                  details:   { type: "string", nullable: true },
                  priority:  { type: "integer", minimum: 1, maximum: 5, nullable: true },
                  dueDate:   { type: "string", format: "date-time", nullable: true },
                  category:  { type: "string", nullable: true },
                  completed: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated task.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } },
          },
          "400": {
            description: "Validation error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "404": {
            description: "Task not found or not owned by the current user.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
      delete: {
        tags: ["Tasks"],
        summary: "Delete a task",
        responses: {
          "204": { description: "Task deleted." },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "404": {
            description: "Task not found or not owned by the current user.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },

    // ─── CATEGORIES ───────────────────────────────────────────────────────────
    "/categories": {
      get: {
        tags: ["Categories"],
        summary: "List all categories",
        description: "Returns the authenticated user's categories, ordered by creation date ascending.",
        responses: {
          "200": {
            description: "Array of categories.",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Category" } },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Create a category",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 32 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Category created.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Category" } } },
          },
          "400": {
            description: "Validation error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "409": {
            description: "A category with that name already exists for this user.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },
    "/categories/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Category ID." },
      ],
      delete: {
        tags: ["Categories"],
        summary: "Delete a category",
        description: "Deletes the category and sets `category` to null on all tasks that used it.",
        responses: {
          "204": { description: "Category deleted." },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "404": {
            description: "Category not found or not owned by the current user.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },

    // ─── EVENTS ───────────────────────────────────────────────────────────────
    "/events": {
      get: {
        tags: ["Events"],
        summary: "List all events",
        description: "Returns the authenticated user's events ordered by startDate ascending.",
        responses: {
          "200": {
            description: "Array of events.",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Event" } },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "500": {
            description: "Database error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
      post: {
        tags: ["Events"],
        summary: "Create an event",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "startDate"],
                properties: {
                  title:     { type: "string", minLength: 1 },
                  details:   { type: "string", nullable: true },
                  startDate: { type: "string", format: "date-time" },
                  dueDate:   { type: "string", format: "date-time", nullable: true },
                  category:  { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Event created.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Event" } } },
          },
          "400": {
            description: "Validation error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "500": {
            description: "Database error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },
    "/events/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Event ID." },
      ],
      patch: {
        tags: ["Events"],
        summary: "Update an event",
        description: "Partially update an event. All fields are optional. Ownership is verified.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title:     { type: "string", minLength: 1 },
                  details:   { type: "string", nullable: true },
                  startDate: { type: "string", format: "date-time" },
                  dueDate:   { type: "string", format: "date-time", nullable: true },
                  category:  { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated event.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Event" } } },
          },
          "400": {
            description: "Validation error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "404": {
            description: "Event not found or not owned by the current user.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
      delete: {
        tags: ["Events"],
        summary: "Delete an event",
        responses: {
          "204": { description: "Event deleted." },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "404": {
            description: "Event not found or not owned by the current user.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },

    // ─── ANALYTICS ────────────────────────────────────────────────────────────
    "/analytics": {
      get: {
        tags: ["Analytics"],
        summary: "Get task analytics",
        description: "Returns aggregated task statistics and a time-series trend for the requested date range.",
        parameters: [
          {
            name: "range",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["7d", "14d", "30d", "90d", "180d"], default: "7d" },
            description: "Date range for the trend data. Ranges ≤ 30 days bucket by day; 90d and 180d bucket by week.",
          },
        ],
        responses: {
          "200": {
            description: "Analytics summary.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    total:          { type: "integer" },
                    completed:      { type: "integer" },
                    overdue:        { type: "integer" },
                    active:         { type: "integer" },
                    dueSoon:        { type: "integer" },
                    completionRate: { type: "integer", description: "0–100 percentage." },
                    byCategory: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name:       { type: "string" },
                          total:      { type: "integer" },
                          completed:  { type: "integer" },
                          incomplete: { type: "integer" },
                        },
                      },
                    },
                    byPriority: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          priority:   { type: "string", example: "P3" },
                          total:      { type: "integer" },
                          completed:  { type: "integer" },
                          incomplete: { type: "integer" },
                        },
                      },
                    },
                    trend: {
                      type: "array",
                      description: "Daily or weekly buckets depending on the requested range.",
                      items: {
                        type: "object",
                        properties: {
                          date:      { type: "string", example: "Jun 9" },
                          completed: { type: "integer" },
                          created:   { type: "integer" },
                          overdue:   { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },

    // ─── AI ───────────────────────────────────────────────────────────────────
    "/ai/chat": {
      post: {
        tags: ["AI"],
        summary: "Chat with the AI assistant",
        description:
          "Sends a conversation to the Ollama LLM. The response is a **streaming plain-text** body (not JSON). Each chunk is a piece of the assistant's reply as it is generated. Attaching images switches the backend to the vision model `gemma4:e4b`.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["messages"],
                properties: {
                  messages: {
                    type: "array",
                    description: "Full conversation history.",
                    items: {
                      type: "object",
                      required: ["role", "content"],
                      properties: {
                        role:    { type: "string", enum: ["user", "assistant"] },
                        content: { type: "string" },
                      },
                    },
                  },
                  images: {
                    type: "array",
                    description: "Raw base64-encoded images (no data-URL prefix) to attach to the last user message.",
                    items: { type: "string", format: "byte" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Streamed assistant reply as plain text.",
            content: { "text/plain": { schema: { type: "string" } } },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "502": {
            description: "Ollama is unreachable or returned an error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },
    "/ai/recommendations": {
      post: {
        tags: ["AI"],
        summary: "Get AI productivity recommendations",
        description:
          "Analyses the user's current task data and returns 3–4 short, personalised productivity tips generated by the LLM.",
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: {
          "200": {
            description: "List of recommendations.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    recommendations: {
                      type: "array",
                      items: { type: "string" },
                      example: [
                        "Tackle your 2 overdue tasks before adding anything new.",
                        "You've completed 80% of tasks — great momentum, keep it up!",
                      ],
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "502": {
            description: "Ollama is unreachable or returned an error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },
    "/ai/assess": {
      post: {
        tags: ["AI"],
        summary: "Burnout check or daily affirmation",
        description:
          "Two modes controlled by `type`:\n- **burnout** — called before adding a new task; the LLM decides whether to show a workload warning based on overdue/active task counts.\n- **affirmation** — called once per day on login; returns a personalised motivational message.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type"],
                properties: {
                  type: { type: "string", enum: ["burnout", "affirmation"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Assessment result.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    show:    { type: "boolean", description: "Only present for `type=burnout`. True means show the warning." },
                    message: { type: "string", description: "Warning text (burnout) or affirmation text. Empty string when `show=false`." },
                  },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "502": {
            description: "Ollama is unreachable or returned an error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },
    "/ai/upload": {
      post: {
        tags: ["AI"],
        summary: "Upload a file for AI chat context",
        description:
          "Accepts a PDF or text file and returns its extracted text (max 20 000 characters). The text is intended to be injected into the AI chat context by the frontend.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "PDF or plain-text file. Max size 10 MB.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Extracted file text.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "Extracted text, truncated to 20 000 characters." },
                    name: { type: "string", description: "Original filename." },
                  },
                },
              },
            },
          },
          "400": {
            description: "No file provided or file exceeds 10 MB.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
          "422": {
            description: "PDF could not be parsed.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } } },
          },
        },
      },
    },

    // ─── AUTH ─────────────────────────────────────────────────────────────────
    "/auth/{any}": {
      parameters: [
        { name: "any", in: "path", required: true, schema: { type: "string" }, description: "Better-Auth sub-path." },
      ],
      get: {
        tags: ["Auth"],
        summary: "Better-Auth — GET handler",
        description:
          "Catch-all route delegated entirely to the [Better-Auth](https://better-auth.dev) library. Common paths include `/api/auth/session` (get current session) and `/api/auth/callback/google` (OAuth callback).",
        security: [],
        responses: {
          "200": { description: "Depends on the specific Better-Auth endpoint." },
        },
      },
      post: {
        tags: ["Auth"],
        summary: "Better-Auth — POST handler",
        description:
          "Catch-all route delegated entirely to Better-Auth. Common paths:\n- `POST /api/auth/sign-in/email` — email + password login\n- `POST /api/auth/sign-up/email` — register a new account\n- `POST /api/auth/sign-out` — log out\n- `POST /api/auth/forget-password` — request a password-reset email\n- `POST /api/auth/reset-password` — set a new password with a reset token",
        security: [],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: {
          "200": { description: "Depends on the specific Better-Auth endpoint." },
        },
      },
    },
  },
};

export default spec;
