-- 2 Books 2 Furious - Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- All app access happens server-side with the secret key, which bypasses RLS.
-- We still enable RLS with no policies so the anon/publishable key can't touch data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Members (the 5 club members; identity is chosen via cookie, no auth)
-- ---------------------------------------------------------------------------
create table if not exists members (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  color           text not null default '#f97316',
  selection_order int  not null default 0,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Books (suggested -> scheduled -> read)
-- ---------------------------------------------------------------------------
create table if not exists books (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  author            text,
  page_count        int,
  audiobook_minutes int,
  genres            text[] not null default '{}',
  cover_url         text,
  description       text,
  isbn              text,
  suggested_by      uuid references members(id) on delete set null,
  status            text not null default 'suggested'
                      check (status in ('suggested','scheduled','read')),
  created_at        timestamptz not null default now()
);

-- Upvotes on backlog suggestions (one per member per book)
create table if not exists book_votes (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references books(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, member_id)
);

-- ---------------------------------------------------------------------------
-- Meetings (a book + a date), picked by a member
-- ---------------------------------------------------------------------------
create table if not exists meetings (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid references books(id) on delete set null,
  meeting_date timestamptz not null,
  location     text,
  picked_by    uuid references members(id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reviews (one per member per book): finished/dnf, stars, optional text
-- ---------------------------------------------------------------------------
create table if not exists reviews (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references books(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  finished   boolean not null default false,
  dnf        boolean not null default false,
  rating     int check (rating between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, member_id)
);

-- ---------------------------------------------------------------------------
-- Comments: powers both per-meeting discussion (meeting_id set) and
-- progress-gated book discussion (book_id + progress_percent set).
-- ---------------------------------------------------------------------------
create table if not exists comments (
  id               uuid primary key default gen_random_uuid(),
  meeting_id       uuid references meetings(id) on delete cascade,
  book_id          uuid references books(id) on delete cascade,
  member_id        uuid references members(id) on delete set null,
  parent_id        uuid references comments(id) on delete cascade,
  body             text not null,
  progress_percent int check (progress_percent between 0 and 100),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Per-member reading progress per book (drives spoiler gating + dashboard)
-- ---------------------------------------------------------------------------
create table if not exists reading_progress (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  book_id    uuid not null references books(id) on delete cascade,
  percent    int not null default 0 check (percent between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (member_id, book_id)
);

-- ---------------------------------------------------------------------------
-- RSVPs per meeting
-- ---------------------------------------------------------------------------
create table if not exists rsvps (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  status     text not null default 'going' check (status in ('going','maybe','out')),
  updated_at timestamptz not null default now(),
  unique (meeting_id, member_id)
);

-- Helpful indexes
create index if not exists idx_reviews_book on reviews(book_id);
create index if not exists idx_comments_meeting on comments(meeting_id);
create index if not exists idx_comments_book on comments(book_id);
create index if not exists idx_meetings_date on meetings(meeting_date);
create index if not exists idx_progress_book on reading_progress(book_id);

-- ---------------------------------------------------------------------------
-- Lock everything down: enable RLS, define no policies. The server uses the
-- secret key (which bypasses RLS); the public/publishable key gets nothing.
-- ---------------------------------------------------------------------------
alter table members          enable row level security;
alter table books            enable row level security;
alter table book_votes       enable row level security;
alter table meetings         enable row level security;
alter table reviews          enable row level security;
alter table comments         enable row level security;
alter table reading_progress enable row level security;
alter table rsvps            enable row level security;

-- ---------------------------------------------------------------------------
-- Seed the 5 members (idempotent on name)
-- ---------------------------------------------------------------------------
insert into members (name, color, selection_order) values
  ('Robin Carey',   '#f97316', 1),
  ('Malek Atassi',  '#38bdf8', 2),
  ('Manoj Kowshik', '#a78bfa', 3),
  ('Roberto Lozier', '#34d399', 4),
  ('Eric Wasser',   '#f472b6', 5)
on conflict (name) do nothing;
