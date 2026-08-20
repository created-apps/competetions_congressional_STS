-- Documents attached to a conversation. The extracted text is stored here and
-- re-injected into the coach's context on every turn, so an uploaded document
-- stays available for follow-up questions (not just the turn it was sent on).
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  filename text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists documents_conversation_idx
  on public.documents (conversation_id, created_at);

-- Accessed only via the server-only service role (same pattern as the other
-- tables): RLS on, no anon/authenticated policies.
alter table public.documents enable row level security;
