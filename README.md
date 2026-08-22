# PitchPit

# Voting company board — Pitch Pit battles, tiered leaderboards, daily seasons.

PitchPit is a Next.js App Router app with Supabase (auth/db/storage), Stripe billing, and Vercel Cron for Eastern-time daily ELO season resets.

## Features

- **THE MAIN EVENT / UNDERCARD / PIT** homepage leaderboards (top 10 / 10 / 50)
- **FLIP THE CARD** toggle between Main Event and Undercard
- **THE PITCH PIT** — hourly cards of 6 matchups (3 Pit / 2 Undercard / 1 Main Event)
- Visitors get 6 votes per hour (one per matchup), then come back for the next card
- Pairings go to companies with the fewest fights so everyone gets voted on
- Shared best-of series: Pit first to 1, Undercard first to 2, Main Event first to 4, with live tallies
- ELO ratings (K=32) apply when a series is decided; reset at midnight America/New_York
- Company onboarding + admin moderation (approve before checkout)
- Stripe one-day pass or daily auto-renew ($1 / $5 / $20)

## Quick start (demo mode)

```bash
cp .env.example .env.local
# DEMO_MODE=true is enough for local UI + Pitch Pit voting
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production setup

1. **Supabase** — create a project, then apply the migration:

```bash
# Via Supabase SQL editor or CLI:
# supabase/migrations/20260820210000_pitchpit_schema.sql
```

Copy project URL, anon key, and service role key into `.env.local`.

2. **Stripe (test mode)** — create products/prices:

```bash
STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-stripe-products.ts
```

Paste the printed price IDs into `.env.local`. Add a webhook endpoint to `/api/stripe/webhook` for:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

3. Set `DEMO_MODE=false`, `CRON_SECRET`, `VISITOR_SECRET`, `IP_HASH_SALT`.

4. Promote an admin: update `profiles.role = 'admin'` for your user in Supabase.

5. Deploy to Vercel and set the same env vars. Cron jobs in `vercel.json` hit `/api/cron/season` at 04:00 and 05:00 UTC (DST-safe Eastern midnight).

## Scripts

| Command            | Purpose                |
| ------------------ | ---------------------- |
| `npm run dev`      | Local development      |
| `npm run build`    | Production build       |
| `npm run test`     | Vitest unit tests      |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run lint`     | ESLint                 |
| `npm run tidy`     | Format + lint fix      |

## Architecture notes

- Billing eligibility (Stripe placements) is separate from daily ELO seasons.
- Votes are atomic via the `cast_vote` Postgres function (or in-memory demo store). Multiple visitors ballot the same hourly card; Elo applies once on series majority. Each visitor may cast 6 votes per card.
- Visitors remain anonymous (`pp_vid` signed cookie + daily IP hash, never raw IP). Sessions are rate-limited to one hourly card.
