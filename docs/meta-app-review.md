# Meta App Review readiness (Phase 11)

Tracks what's needed to take the `publio` Meta app out of Development mode
and get `instagram_business_basic` + `instagram_business_content_publish`
approved for real users (not just app admins/testers). See
`docs/adr/ADR-005-instagram-oauth-flow.md` for the OAuth contract itself.

## Callback URLs — configure these in the Meta dashboard now

Instagram Business Login settings → same screen as the OAuth redirect URI:

- **Deauthorize callback URL**: `https://www.publio.website/api/integrations/instagram/deauthorize`
- **Data deletion request URL**: `https://www.publio.website/api/integrations/instagram/data-deletion`

Both verify Meta's `signed_request` via HMAC-SHA256 using
`INSTAGRAM_CLIENT_SECRET` (`src/server/instagram/signed-request.ts`) before
acting — an unverified/tampered request is rejected, not trusted.
`docs/…/legal/data-deletion` is the public instructions page (also serves
as the status URL the data-deletion callback returns).

## Scope justifications (paste into the App Review submission form)

**`instagram_business_basic`**: Required to read the connected Instagram
professional account's basic profile (username, account type, profile
picture) so Publio can confirm the account is Business/Creator-eligible
and show the user which account they've connected. Used once at connect
time and again during periodic token validation
(`src/server/maintenance/jobs.ts` → `validateConnectedTokens`).

**`instagram_business_content_publish`**: Core product function — Publio
is a scheduling/publishing tool. This scope is used exclusively to create
media containers and publish them (`src/server/instagram/live-provider.ts`)
when a user explicitly schedules or requests immediate publication of
their own content to their own connected account. No content is ever
published without an explicit user action.

## What's done

- [x] Business Login for Instagram flow (not Facebook Login) — ADR-005
- [x] Real OAuth connect/callback, encrypted token storage
- [x] Deauthorize callback — disconnects the account when the user revokes
      access from Instagram/Facebook settings
- [x] Data deletion callback + public instructions page
- [x] Privacy Policy and Terms of Service drafts (`/legal/privacy`,
      `/legal/terms`) — **still marked as legal-review pending**, see below
- [x] Token validation cron (catches revoked tokens proactively)
- [x] Account type restricted to BUSINESS/MEDIA_CREATOR only

## What's still pending — needs the account holder, not code

- [ ] **Legal review** of Privacy Policy / Terms — both pages currently
      carry a visible "rascunho, pendente de revisão jurídica" banner.
      Remove that banner only after an actual review; Meta reviewers do
      read the privacy policy.
- [ ] **Business verification** in Meta Business Manager (required for
      Advanced Access to these scopes for a live app)
- [ ] **App icon, category, and business use case description** in the
      Meta dashboard
- [ ] **Screencast/screenshots** of the connect → compose → publish flow
      for the App Review submission (reviewers must see it working)
- [ ] **A real domain + HTTPS in production** — already done
      (`https://www.publio.website`)
- [ ] Submit for App Review once the above are ready; Development mode
      (current state) only allows app admins/testers to authenticate,
      which is why every account used so far had to be added as a tester
