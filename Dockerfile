# ── Stage 1: install all deps ─────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Placeholder env vars so Prisma and Better-Auth don't throw at module evaluation
# during the build. Real values are injected at runtime via docker-compose.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost/placeholder"
ENV BETTER_AUTH_SECRET="build-time-placeholder"
ENV BETTER_AUTH_URL="http://localhost:3000"
ENV SESSION_SECRET="build-time-placeholder"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV RESEND_API_KEY="re_placeholder"
ENV GOOGLE_CLIENT_ID="placeholder.apps.googleusercontent.com"
ENV GOOGLE_CLIENT_SECRET="placeholder"
ENV NEXT_PUBLIC_FIREBASE_API_KEY="placeholder"
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="placeholder.firebaseapp.com"
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID="placeholder"
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="placeholder.appspot.com"
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="000000000000"
ENV NEXT_PUBLIC_FIREBASE_APP_ID="1:000000000000:web:placeholder"
ENV FIREBASE_PROJECT_ID="placeholder"
ENV FIREBASE_CLIENT_EMAIL="placeholder@placeholder.iam.gserviceaccount.com"
ENV FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC7placeholder\n-----END PRIVATE KEY-----\n"
ENV GOOGLE_AI_API_KEY="placeholder"
ENV GOOGLE_AI_MODEL="gemini-2.5-flash"

# Generate Prisma client, then build Next.js with standalone output
RUN npx prisma generate
RUN npm run build

# ── Stage 3: lean production image ────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Static assets
COPY --from=builder /app/public ./public

# Next.js standalone server + static output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

# Prisma CLI + generated client + schema (needed for migrate deploy at startup)
COPY --from=builder /app/node_modules/.bin                 ./node_modules/.bin
COPY --from=builder /app/node_modules/prisma               ./node_modules/prisma
COPY --from=builder /app/node_modules/.prisma              ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma              ./node_modules/@prisma
COPY --from=builder /app/prisma                            ./prisma

COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["sh", "entrypoint.sh"]
