-- Emoji reactions on community chat messages.

create table if not exists public.community_message_reactions (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.community_messages(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

comment on table public.community_message_reactions is 'Toggleable emoji reactions on community_messages rows. Insert/delete only (toggle), no update.';

create index if not exists community_message_reactions_message_id_idx
  on public.community_message_reactions(message_id);

alter table public.community_message_reactions enable row level security;

create policy "community_message_reactions: authenticated select"
  on public.community_message_reactions for select
  to authenticated
  using (true);

create policy "community_message_reactions: owner insert"
  on public.community_message_reactions for insert
  with check (auth.uid() = user_id);

create policy "community_message_reactions: owner delete"
  on public.community_message_reactions for delete
  using (auth.uid() = user_id);

-- Realtime DELETE payloads only include primary-key columns by default;
-- reactions need message_id/user_id/emoji on delete to update client state.
alter table public.community_message_reactions replica identity full;

alter publication supabase_realtime add table only public.community_message_reactions;
