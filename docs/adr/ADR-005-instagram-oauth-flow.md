# ADR-005: Instagram OAuth flow — Business Login for Instagram

## Status
Accepted (2026-08-16)

## Context
Meta currently exposes two ways to connect an Instagram professional account:

1. **Facebook Login for Business** — the legacy flow. The user logs in with a
   Facebook identity, and the Instagram account must be linked to a Facebook
   Page (`graph.facebook.com`, scopes `instagram_basic`,
   `instagram_content_publish`, `pages_show_list`, ...).
2. **Business Login for Instagram** ("Instagram API with Instagram Login",
   GA since July 2024) — the user authenticates directly with their
   Instagram identity, no Facebook Page required
   (`api.instagram.com` / `graph.instagram.com`, scopes
   `instagram_business_basic`, `instagram_business_content_publish`, ...).

Verified against Meta's official developer documentation on 2026-08-16
(developers.facebook.com/docs/instagram-platform).

## Decision
Publio uses **Business Login for Instagram** (option 2) as the only supported
connection flow. It matches the product's positioning (Instagram-first, not
"manage my Facebook Page's Instagram"), removes a confusing prerequisite
step for users (no Facebook Page linking), and is Meta's forward-looking
recommendation for new Instagram-only integrations.

## Exact contract (source of truth for `src/server/instagram/live-provider.ts`)

- Authorize: `GET https://api.instagram.com/oauth/authorize`
  params: `client_id`, `redirect_uri`, `response_type=code`,
  `scope=instagram_business_basic,instagram_business_content_publish`, `state`.
- Exchange code → short-lived token (~1h): `POST https://api.instagram.com/oauth/access_token`
  body: `client_id`, `client_secret`, `grant_type=authorization_code`, `redirect_uri`, `code`
  → `{ access_token, user_id }`.
- Exchange short-lived → long-lived token (60 days): `GET https://graph.instagram.com/access_token`
  params: `grant_type=ig_exchange_token`, `client_secret`, `access_token`
  → `{ access_token, token_type, expires_in }`.
- Refresh a long-lived token (must be ≥24h old, not expired): `GET https://graph.instagram.com/refresh_access_token`
  params: `grant_type=ig_refresh_token`, `access_token` → new 60-day token.
- Profile: `GET https://graph.instagram.com/{version}/me`
  params: `fields=user_id,username,account_type,name,profile_picture_url`, `access_token`.
- Create media container: `POST https://graph.instagram.com/{version}/{ig-user-id}/media`
  - image: `image_url`, `caption`
  - carousel item: `image_url` or `video_url`, `is_carousel_item=true`
  - carousel container: `media_type=CAROUSEL`, `children=<comma-separated container ids>` (max 10), `caption`
  - reel: `video_url`, `media_type=REELS`, `caption`
- Check container status: `GET https://graph.instagram.com/{version}/{container-id}`
  params: `fields=status_code` → `IN_PROGRESS | FINISHED | PUBLISHED | ERROR | EXPIRED`.
  Meta's own guidance: poll at most once per minute, for no more than 5 minutes.
- Publish: `POST https://graph.instagram.com/{version}/{ig-user-id}/media_publish`
  params: `creation_id` → returns the published media id.
- Permalink: `GET https://graph.instagram.com/{version}/{media-id}?fields=permalink`.

## Limits that shaped the domain model
- 100 API-published posts per Instagram account per rolling 24h window
  → `InstagramRateLimitService` (§19 of the spec) enforces this before
  queuing a publish attempt.
- Carousel: max 10 items, all cropped to the first item's aspect ratio.
- Images must be JPEG; all media must be hosted at a publicly reachable
  HTTPS URL at container-creation time — this is why `MediaAsset` storage
  must serve a public (or long-lived signed) URL, not a private one, when
  handed to the Instagram provider.

## Consequence
`META_GRAPH_API_VERSION` is a config value (`.env`), not hardcoded, so a
version bump is a one-line change. All of the above lives behind
`InstagramProvider` — nothing outside `src/server/instagram/` constructs a
Graph API URL directly (§7 of the spec).
