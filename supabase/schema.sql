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
-- Comments: progress-gated book discussion (book_id + progress_percent).
-- meeting_id is retained for historical rows only; new comments are book-scoped.
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

-- ---------------------------------------------------------------------------
-- Per-member read tracking. Separate from books.status: a book's status='read'
-- only means the club picked/finished it as a group. Whether an individual
-- member has personally read it is opt-in and tracked here.
-- ---------------------------------------------------------------------------
create table if not exists member_book_reads (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  book_id    uuid not null references books(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (member_id, book_id)
);

-- ---------------------------------------------------------------------------
-- Feature requests ("suggest a feature") + upvotes
-- ---------------------------------------------------------------------------
create table if not exists feature_requests (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text,
  submitted_by uuid references members(id) on delete set null,
  status       text not null default 'open'
                 check (status in ('open','planned','done','declined')),
  created_at   timestamptz not null default now()
);

create table if not exists feature_request_votes (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references feature_requests(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, member_id)
);

-- ---------------------------------------------------------------------------
-- Cached recommendations (one row per scope: 'group' or a member uuid).
-- Served by default so we don't hit the Hardcover API on every page view.
-- ---------------------------------------------------------------------------
create table if not exists recommendations_cache (
  scope           text primary key,
  recommendations jsonb not null default '[]'::jsonb,
  generated_at    timestamptz not null default now()
);

-- Recommendations the club has explicitly dismissed (with a reason). The
-- recommender excludes these titles when ranking/refreshing the Top 5.
create table if not exists dismissed_recommendations (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  hardcover_id text,
  reason       text,
  dismissed_by uuid references members(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (title)
);

-- ---------------------------------------------------------------------------
-- Idempotent migrations for columns added after the initial schema.
-- ---------------------------------------------------------------------------
-- Book-level picker attribution for historical books with no meeting/date.
alter table books add column if not exists picked_by uuid references members(id) on delete set null;

-- Reading progress can be entered as percent, pages, or audiobook minutes.
-- `percent` stays the derived gate used for spoiler-gating regardless of unit.
alter table reading_progress add column if not exists unit text not null default 'percent';
alter table reading_progress drop constraint if exists reading_progress_unit_check;
alter table reading_progress add constraint reading_progress_unit_check
  check (unit in ('percent','pages','minutes'));
alter table reading_progress add column if not exists position int;
alter table reading_progress add column if not exists total int;

-- Helpful indexes
create index if not exists idx_reviews_book on reviews(book_id);
create index if not exists idx_feature_votes_request on feature_request_votes(request_id);
create index if not exists idx_member_reads_book on member_book_reads(book_id);
create index if not exists idx_member_reads_member on member_book_reads(member_id);
create index if not exists idx_comments_meeting on comments(meeting_id);
create index if not exists idx_comments_book on comments(book_id);
create index if not exists idx_meetings_date on meetings(meeting_date);
create index if not exists idx_progress_book on reading_progress(book_id);
create index if not exists idx_books_picked_by on books(picked_by);

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
alter table feature_requests      enable row level security;
alter table feature_request_votes enable row level security;
alter table member_book_reads     enable row level security;
alter table recommendations_cache enable row level security;
alter table dismissed_recommendations enable row level security;

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
