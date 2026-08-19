# ADR-006: Zero-cost infrastructure topology

## Status
Accepted (2026-08-17)

## Context
The default assumption in `docs/implementation-plan.md` (§49 of the product
spec) was managed Postgres + managed Redis + a paid always-on worker host
(Railway/Fly/Render). The user has since made an explicit, durable
constraint: **no infrastructure spend** while bootstrapping. This is a
product decision, not a technical limitation — the architecture already
supports it, since every component talks to its dependency over a
connection string / env var, never a vendor SDK baked into business logic.

## Decision
Run entirely on free tiers, with the worker on the user's own machine:

| Component | Free-tier choice | Why this one |
|---|---|---|
| Postgres | **Supabase** free project | Generous free tier, standard Postgres (not a proprietary dialect), built-in connection pooler for when the web app later moves to serverless. |
| Redis (BullMQ) | **Upstash** free tier (fallback: Redis Cloud free 30MB) | Upstash's free tier speaks the real Redis protocol over TCP+TLS (`rediss://`), which is what BullMQ needs — not just its REST API. |
| Object storage | **Cloudflare R2** free tier | 10GB storage free, **zero egress fees** (unlike S3, where egress is the cost that bites once real users watch/download media). S3-compatible, so `StorageProvider` needs no special-casing. |
| Worker | **User's own machine**, `npm run worker` | A BullMQ worker is just a long-running Node process; it doesn't need to be colocated with anything. Zero cost, at the price of needing the machine online for scheduled jobs to fire on time. |
| Web app (Next.js) | **Vercel Hobby** (free) tier, default recommendation | Gets a public HTTPS URL for free, which the Instagram OAuth redirect and the Stripe webhook both require. Alternative: also self-host on the same machine behind a Cloudflare Tunnel — fully free with no third-party ToS question, but doubles what has to stay online. Flagged here as the one open call; revisit if the user wants everything local. |

## Consequences

**The worker being offline is now an expected, not exceptional, condition.**
This is exactly what §68/§72 of the product spec (missed-schedule handling,
reconciliation job) were designed for — no design change needed, but it
means those two pieces (Phase 7 and Phase 10) are load-bearing rather than
nice-to-have polish. When the worker machine is offline at a post's
`scheduledAt`, the post is **not** silently skipped: the BullMQ job still
fires the moment the worker reconnects (delayed jobs sit in Redis, not on
the worker's clock), and the reconciliation job independently re-derives
"should this exist" from Postgres so a Redis hiccup can't lose a post.

**Free-tier limits to design around, not ignore:**
- Supabase free projects pause after ~1 week with zero traffic — a cold
  start adds latency to the first request/job after a pause, but does not
  lose data. Worth knowing before assuming "the DB is always warm."
- Supabase's *direct* connection (port 5432) has a low connection cap; the
  *pooled* connection (port 6543, pgbouncer) should be used by anything
  that opens many short-lived connections (the web app on serverless).
  Prisma Migrate must run against the *direct* URL, not the pooled one.
  Two env vars, not one — see the updated `.env.example`.
- Upstash's free tier caps commands/day and max connections — fine for one
  workspace's worker; would need a paid tier before real multi-tenant
  volume.
- Vercel Hobby's ToS nominally restricts commercial use; this is
  extremely common practice for bootstrapped MVPs but is a real caveat,
  not a legal green light — worth an explicit decision once there's
  revenue, not a silent assumption forever.

## Non-decision (deferred)
Whether the Next.js web app also runs on the user's machine (via a tunnel)
instead of Vercel. Defaulted to Vercel Hobby because it's the lower-friction
path to a public HTTPS URL (needed for Meta OAuth + Stripe webhooks) — flag
this ADR for a revisit if that default is wrong.
