-- Authentication: email/password users and server-side sessions.
-- Run this in your Supabase SQL editor after 001 and 002.

-- Users: one row per registered account. Passwords are stored only as a
-- salted scrypt hash (see lib/auth/password.ts) — never in plain text.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness safety net (the app also lowercases emails).
create unique index if not exists users_email_lower_idx
  on public.users (lower(email));

-- Sessions: an opaque random token per sign-in, looked up on each request.
create table if not exists public.sessions (
  token text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_user_idx on public.sessions (user_id);
create index if not exists sessions_expires_idx on public.sessions (expires_at);

-- All access is via the server-only service role, so keep RLS on with no
-- anon/authenticated policies — the browser can never read these tables.
alter table public.users enable row level security;
alter table public.sessions enable row level security;
