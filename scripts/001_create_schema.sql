-- Competition Coach schema
-- Run this in your Supabase SQL editor (or via the v0 "Run Script" action).

-- Assistants: one row per competition coach.
create table if not exists public.assistants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  system_prompt text not null,
  conversation_starters jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conversations: a chat thread between an anonymous user and one assistant.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references public.assistants (id) on delete cascade,
  user_id text not null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_assistant_idx
  on public.conversations (user_id, assistant_id, updated_at desc);

-- Messages: the transcript, including tool (web_search) calls.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null default '',
  tool_name text,
  tool_input jsonb,
  tool_output jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at asc);

-- Row Level Security. The app talks to Supabase with the service role from
-- server-only code, so we keep RLS on and grant no anon/authenticated policies.
alter table public.assistants enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Allow anyone to read the list of active assistants (public catalog).
drop policy if exists "assistants_public_read" on public.assistants;
create policy "assistants_public_read"
  on public.assistants for select
  using (is_active = true);
