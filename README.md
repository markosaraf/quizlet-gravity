# Quizlet Gravity

Website and mobile apps for https://www.quizletgravity.com.

Browse and import shared Quizlet sets, write your own sets, play as a guest or with an account, and compete on one leaderboard per set. Each player has one personal best per set. Email verification, password recovery and Google sign-in are supported. Moderation controls are restricted to database-authorized administrators.

## Source
- Website: repository root (Next.js).
- Android and iOS: `mobile/`.
- Classic source archive: https://github.com/markosaraf/quizlet-gravity-classic-no-leaderboards.

## Development
Run `npm ci`, configure an ignored `.env.local` using `.env.example`, then `npm run dev -- --port 3035`.
Checks: `npm run typecheck` and `npm test`. SQL schema files live in `scripts/`.

## Deployment and secrets
Server credentials are Vercel environment secrets, never browser variables or committed code. Production is the `quizletgravity-launch` project. Configure the Google OAuth web client callback as `https://www.quizletgravity.com/api/auth/callback/google`. App sign-in returns through the `quizletgravity` URL scheme with a one-time, proof-key-bound handoff.

Android release signing stays outside this repository. Build from `mobile/` using its BUILDING.md. Version 2.0.0 uses the stable Android and iOS application IDs so it can update the existing stable apps. iOS distribution requires Apple signing/provisioning.

This independent project is not affiliated with Quizlet.

## Public-game search discovery and admin overview

Public study games use their original title as the search title and an English description with the actual flashcard count. The page renders the title and terms on the server and declares its own canonical URL. `/games` is a paginated, crawlable directory linked from `/sets`.

`/sitemap.xml` is a live sitemap index; `/sitemaps/games/0.xml` and subsequent pages contain up to 1,000 canonical game URLs each. Changes appear within the 60-second CDN cache. `lastmod` changes only with public game content. Google Search Console should retain the root sitemap URL; ordinary games are not eligible for Google's jobs/livestream Indexing API.

Apply `scripts/game-indexing-schema.sql` using a direct database connection before deployment. It is additive and idempotent. A database trigger records insert/update/delete URL changes transactionally, including imports and administrative deletion, and seeds existing games once. Saving a game invokes the worker after the response. Authenticated Vercel cron retries pending changes daily at 07:30 UTC; failed requests back off. Claims expire after five minutes so interrupted workers recover. Delivery is at least once. Preview environments never send IndexNow requests. `CRON_SECRET` must be configured in production. `INDEXNOW_KEY` optionally overrides the existing public ownership key; `/indexnow-key.txt` serves the configured value.

`/admin/users` has an Admin overview button above its settings (`/users` redirects there). `/admin/overview` and its data API enforce administrator sessions. Account counts are current totals excluding deleted accounts; activity uses Europe/Zurich calendar days. Games played counts recorded starts/replays; completions are shown separately. Created-game counts cover games still in the catalogue. External reporting links explain the differences between search clicks and site visits. The discovery section reports submitted/queued requests, never claims that a game is indexed.

Checks: `node --import tsx --test tests/game-indexing.test.cts`; against an isolated database with `VERCEL_ENV=preview`, `node --env-file=.env.local --import tsx scripts/test-game-indexing.cts` and `node --env-file=.env.local scripts/game-indexing-smoke.mjs` (local app on port 4390).

The overview metric cards are selectable and show daily current/previous curves, keyboard-accessible point values, and percentage change (zero baselines display “New”). Account totals are accompanied by creation counts from currently retained users; past guest conversions and deletions are not reconstructed. Community comparisons end at the same Zurich clock time in the preceding equal-length period.

Vercel traffic uses the official Web Analytics API through an admin-only server route and a project-scoped `VERCEL_ANALYTICS_TOKEN` production secret. Responses are cached for five minutes. Visitor totals come from Vercel's period aggregation, not sums of daily unique counts. Vercel periods use UTC; the current day is partial. The Hobby API retains 31 days, so 30-day previous-period comparisons are explicitly unavailable. Bounce rate remains in the linked full Vercel report. The app displays connection status if authorization is missing or expires, without fabricated numbers.
