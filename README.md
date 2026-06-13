# 2 Books 2 Furious

A private book club web app for the five members of **2 Books 2 Furious** — a monthly
sci-fi/fantasy (with a smattering of thrillers) club that lives on Discord. Dark-mode-first,
no login required: you just pick which member you are.

Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**, with **Supabase
(Postgres)** for storage. All database access is server-side using the Supabase **secret key**,
so the browser never holds a credential.

## Features

- **Dashboard** — next meeting countdown, the current book, and a per-member reading-progress view.
- **Meetings** — schedule a book + date, RSVP (going / maybe / can't), per-meeting discussion threads, and "mark as read" wrap-up.
- **Backlog** — suggest books (autofilled from Google Books, covers from Open Library), upvote, and promote to a meeting.
- **Reviews** — finished / DNF, 1–5 stars, optional text. One review per member per book.
- **Leaderboard** — books ranked by average rating, plus member stats (reviews, finishes, generosity, best picker).
- **Rotation** — whose turn it is to pick next (fewest picks, tie-broken by rotation order), plus a weighted random "spin the wheel".
- **Analytics** — genre breakdown, ratings distribution, and book length over time (Recharts).
- **Spoiler-safe discussion** — set your reading progress; you only see comments at or below where you are, and your comments are tagged with your progress.
- **Book recommendations** *(optional)* — a Hardcover-powered heuristic that matches the club's (or one member's) top-rated reads to similar highly-rated books.
- **Discord notifications** *(optional)* — posts to your channel when meetings, suggestions, and reviews happen.
- **Wrapped** — a year-in-review summary.
- **Per-member accent colors** — each member customizes their own color (Settings).
- **Dark / light theme** toggle (defaults to dark).

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment variables

Create `.env.local` (already created locally; recreate on a new machine):

```bash
B2F_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
B2F_SUPABASE_SECRET_KEY=sb_secret_...
# Optional integrations:
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
# HARDCOVER_API_KEY=Bearer eyJ...   (value may already include the "Bearer " prefix)
```

The app-specific `B2F_` prefix is used so a global `SUPABASE_URL` / `SUPABASE_KEY` exported in
your shell can't shadow `.env.local` during `next dev`. The generic `SUPABASE_URL` /
`SUPABASE_SECRET_KEY` names also work as a fallback (handy on Vercel). The secret key bypasses
RLS and must stay server-side — never expose it to the client, and never commit `.env.local`
(it is gitignored).

### Database scripts (optional helpers)

- `node scripts/apply-schema.mjs` — applies `supabase/schema.sql` to the live DB via the pooler
  (needs `DUDE_DB_PASS` in your shell). Useful instead of pasting SQL into the dashboard.
- `node scripts/seed-books.mjs` — seeds the club's reading history (idempotent).
- `node scripts/enrich-books.mjs` — backfills covers/pages/genres from Open Library.

### 3. Create the database schema (one time)

Open your Supabase dashboard → **SQL Editor** → **New query**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all tables, enables RLS
(with no policies, so only the secret key can read/write), and seeds the five members.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000 and pick who you are.

## Deploy to Vercel

1. Push to GitHub (this repo's remote is already set).
2. In Vercel, import the repo.
3. Add the environment variables from step 2 in **Project Settings → Environment Variables**
   (at minimum `SUPABASE_URL` and `SUPABASE_SECRET_KEY`).
4. Deploy. Share the URL only with club members — there's no auth, so the link is the gate.

## Optional integrations

- **Discord**: create a channel webhook (Server Settings → Integrations → Webhooks) and set
  `DISCORD_WEBHOOK_URL`. Status shows under Settings.
- **Book recommendations**: set `HARDCOVER_API_KEY` (free at hardcover.app; the value may already
  include the `Bearer ` prefix — both forms are handled). The `/recommendations` page lights up
  automatically and matches your top-rated reads to similar books on Hardcover.

## Notes on identity

There's intentionally no authentication. Your selected member is stored in a cookie and used to
attribute reviews, comments, picks, and progress. Switch identities anytime from the header.
