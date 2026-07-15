-- Community chat MVP: single global room.

create table if not exists public.community_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.community_messages is 'Single global community chat room. Moderation (soft-delete) is service-role only; no regular-user update/delete policy.';

create index if not exists community_messages_created_at_idx
  on public.community_messages(created_at desc) where is_deleted = false;

alter table public.community_messages enable row level security;

create policy "community_messages: authenticated select non-deleted"
  on public.community_messages for select
  to authenticated
  using (is_deleted = false);

create policy "community_messages: owner insert"
  on public.community_messages for insert
  with check (auth.uid() = user_id);

-- No update/delete policy for regular users; moderation is service-role only.

alter publication supabase_realtime add table only public.community_messages;
