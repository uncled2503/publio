# Publio — Implementation Plan

## 1. What this is

Publio is a multi-tenant SaaS for scheduling and publishing content to Instagram
Professional accounts through the official Meta Graph API. This document is the
single source of truth for architecture decisions, phase ordering, and what
"done" means for each phase. It is updated as the project evolves.

## 2. Discovery findings (Phase 0)

The working directory was empty when this project started. No prior code,
migrations, or configuration existed. The project was bootstrapped from
scratch with `create-next-app` (Next.js 16, App Router, TypeScript, Tailwind
v4, ESLint) on 2026-08-16.

## 3. Architecture overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Next.js App (Vercel)                     │
│  App Router UI  +  Route Handlers (API)  +  Server Actions        │
│  ─ Auth.js (session, credentials)                                 │
│  ─ Service layer (Workspace, Post, Media, Instagram, Billing...)  │
│  ─ Repository/data layer over Prisma                               │
└───────────────┬───────────────────────────────────┬───────────────┘
                │                                   │
                ▼                                   ▼
        ┌───────────────┐                   ┌───────────────────┐
        │  PostgreSQL   │                   │   Redis (BullMQ)   │
        │  (Prisma)     │                   │   job queues       │
        └───────────────┘                   └─────────┬──────────┘
                                                        │
                                                        ▼
                                          ┌───────────────────────────┐
                                          │  Worker process (Node)     │
                                          │  long-running, separate    │
                                          │  deploy target (Railway/   │
                                          │  Fly/Render, not Vercel)   │
                                          │  ─ publish-post-target     │
                                          │  ─ media-processing        │
                                          │  ─ token-validation (cron) │
                                          │  ─ reconciliation (cron)   │
                                          │  ─ cleanup (cron)          │
                                          └──────────┬─────────────────┘
                                                      │
                                          ┌───────────┴────────────┐
                                          ▼                        ▼
                                ┌──────────────────┐    ┌────────────────────┐
                                │ Instagram Graph   │    │ S3-compatible       │
                                │ API (Meta)        │    │ storage (S3 / R2)   │
                                └──────────────────┘    └────────────────────┘
```

Key principle: the Next.js request/response cycle **never** talks to the Meta
API directly for publishing. Every publish — including "publish now" — goes
through the queue and is executed by the worker. This keeps a single code
path responsible for idempotency, retries, and locking (see §16 of the master
spec, and `docs/job-queue.md`).

## 4. Architectural decisions (see `docs/adr/` for full ADRs)

| Decision | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, TS | Requested stack; SSR + API routes in one deployable unit for the web tier |
| ORM | Prisma | Strong TS integration, migrations, mature ecosystem. Drizzle considered but Prisma's migration tooling and admin ergonomics win for a team that will grow. |
| Auth | Auth.js (NextAuth v5) + Credentials provider + Prisma adapter | Self-hosted, no per-MAU vendor cost, full control over session/workspace claims. Clerk was considered; rejected to avoid coupling core auth to a third-party vendor for an app whose differentiator is publishing reliability, not auth UX. |
| Job queue | BullMQ + Redis | Battle-tested, delayed jobs, retries with backoff, dead-letter (failed) queue built in — exactly what §14–19 require. |
| Storage | S3-compatible via a `StorageProvider` interface | Avoids lock-in; works with AWS S3 in prod and R2 or MinIO in dev. |
| Token encryption | AES-256-GCM via Node `crypto`, key from `TOKEN_ENCRYPTION_KEY` | Authenticated encryption, no external KMS dependency for MVP; interface designed so a KMS-backed implementation can replace it later. |
| Billing | Stripe | Requested; webhook-driven, idempotent via stored `stripe_event_id`. |
| Social provider mode | `SOCIAL_PROVIDER_MODE=mock\|live` | Allows full local/E2E development and CI without live Meta credentials, per §79. |
| Worker deployment | Separate long-running Node process, NOT Vercel functions | Vercel serverless functions cannot run persistent BullMQ workers; worker needs its own always-on process. |
| Infra budget | **Zero-cost**: Supabase (Postgres), Upstash (Redis), Cloudflare R2 (storage), worker on the user's own machine, web app on Vercel Hobby | Explicit user constraint — no infrastructure spend while bootstrapping. See `docs/adr/ADR-006-zero-cost-infrastructure.md` for the free-tier limits this trades against and how the design (missed-schedule handling, reconciliation job) already absorbs "the worker machine isn't always online." |

## 5. Data model

Implemented in `prisma/schema.prisma`. Mirrors §5 of the spec: `User`,
`Workspace`, `WorkspaceMember`, `SocialAccount`, `MediaAsset`, `Post`,
`PostMedia`, `PostTarget`, `PublishAttempt`, `Subscription`, `UsageCounter`,
`AuditLog`, plus NextAuth's required tables (`Account`, `Session`,
`VerificationToken`). All workspace-scoped tables carry `workspaceId` with an
index, and every service-layer read/write is required to filter by the
authenticated user's workspace membership (see `docs/security.md`).

## 6. Post state machine

`DRAFT → SCHEDULED → QUEUED → PREPARING → PROCESSING_MEDIA → PUBLISHING →
PUBLISHED`, with `FAILED` and `CANCELED` as terminal/recoverable states.
Implemented as an explicit transition table in
`src/server/domain/post-state-machine.ts` — no code may set `post.status`
directly outside that module. Unit-tested exhaustively (valid and invalid
transitions).

## 7. Milestones / phases

Phases follow §76 of the spec exactly. Each phase ends with a report in the
conversation (Implemented / Files / Tests / How to validate / Pendências /
Next) per §91 — this document tracks only the checklist state.

- [x] Phase 0 — Discovery & this plan
- [x] Phase 1 — Foundation (Next.js, TS, Tailwind, custom shadcn-style UI kit, Prisma schema, config/env validation, Docker Compose, lint/format/test harness). Redis is configured but unused until Phase 6 (BullMQ).
- [x] Phase 2 — Auth & Workspaces (signup, login, workspace creation, membership, RBAC, onboarding, workspace switcher). Team management UI (`/team`) and workspace settings UI (`/settings`, incl. owner-only delete) were built later (2026-08-19) on top of the WorkspaceService methods this phase already had.
- [x] Phase 3 — Instagram OAuth (connect/callback/mock-consent routes, TokenVault, live + mock InstagramProvider, SocialAccountService, InstagramRateLimitService, Accounts UI, disconnect action). Reconnect exists; "revalidate future posts after reconnect" (§67) is deferred until PostService exists (Phase 5/7).
- [x] Phase 4 — Media (S3-compatible storage abstraction, presigned direct-to-storage upload, BullMQ queue + worker process pulled forward from Phase 6, MIME sniffing, JPEG dimension parsing, ffprobe video metadata, MediaValidationService against Meta's verified specs, media library UI). Verified end-to-end against real Supabase + R2 + Upstash + local ffmpeg, not just unit tests.
- [x] Phase 5 — Composer (create/edit post, draft, caption, image/carousel/reel, preview). Draft-only: post stays in `DRAFT` status, no scheduling/publishing wiring yet (that's Phase 6/7). `PostService.updateDraft` enforces per-type media count (1 image/reel, 2-10 carousel) and that selected media/accounts belong to the workspace.
- [x] Phase 6 — Scheduling (timezone handling via luxon, schedule/reschedule/publish-now/cancel, delayed BullMQ job per PostTarget keyed by a deterministic jobId)
- [x] Phase 7 — Publishing worker (`src/server/publishing/publish-post-target-job.ts`): container creation per post type, status polling per ADR-005's documented interval, publish, permalink, PublishAttempt records, rate-limit gating, MISSED_SCHEDULE on disconnected accounts. Retries via BullMQ's own attempts/backoff; idempotency via one deterministic job per PostTarget. Locking beyond that (e.g. cross-process mutual exclusion) not yet needed — single worker process.
- [x] Phase 8 — Calendar (month-grid view grouped by scheduled day in workspace timezone). No dedicated history/audit-log UI yet (audit_logs table is populated, no page reads it).
- [ ] Phase 9 — Billing (Stripe checkout, webhook, entitlements, customer portal)
- [ ] Phase 10 — Production hardening (rate limits, observability, audit logs, reconciliation, health checks, cleanup jobs)
- [ ] Phase 11 — Meta review readiness (docs, scopes, privacy, deletion process)

## 8. Risks & external dependencies

- **No live Meta app credentials in this environment.** All Instagram
  integration is built against the official Graph API contract as documented
  publicly, behind the `InstagramProvider` interface, with a `mock` mode for
  local/E2E use. Anything requiring a real App Review / live token is marked
  `REQUIRES_META_CREDENTIALS` and documented in `docs/meta-live-test.md`.
- **Cloud infrastructure is provisioned and live** (updated 2026-08-18):
  Supabase (Postgres, schema migrated), Upstash (Redis, verified), and
  Cloudflare R2 (storage, verified with public URL round-trip) are all
  connected in `.env` — see `docs/adr/ADR-006-zero-cost-infrastructure.md`.
  Still missing: a Stripe account (needed for Phase 9) and a domain
  (needed before Meta App Review / production deploy).
- **Windows dev environment.** Scripts avoid POSIX-only assumptions where
  practical; Docker Compose is the source of truth for local Postgres/Redis
  rather than native installs.

## 9. Non-goals for this cycle

Per §75: no DM inbox, no comment automation, no TikTok/LinkedIn/Facebook/
YouTube providers, no AI generation, no advanced analytics. The `SocialProvider`
interface exists so these can be added later without a rewrite, but no other
provider is implemented now.
