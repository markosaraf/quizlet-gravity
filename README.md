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
