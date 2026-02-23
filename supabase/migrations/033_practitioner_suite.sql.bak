-- Migration 033: Practitioner's Suite (Rituals & Tarot)

-- 1. Rituals Table
create table if not exists rituals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  intention text,
  phase text check (phase in ('New Moon', 'Waxing', 'Full Moon', 'Waning', 'Dark Moon', 'Any')),
  estimated_duration_minutes integer,
  materials text[] default '{}',
  tags text[] default '{}',
  is_favorite boolean default false,
  visibility text check (visibility in ('private', 'public')) default 'private',
  approval_status text check (approval_status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Ritual Steps Table
create table if not exists ritual_steps (
  id uuid primary key default gen_random_uuid(),
  ritual_id uuid not null references rituals(id) on delete cascade,
  step_order integer not null,
  step_type text not null check (step_type in ('instruction', 'action', 'meditation', 'chant', 'note')),
  content text not null,
  duration_seconds integer, -- Optional timer
  created_at timestamptz default now()
);

-- 3. Tarot Readings Table
create table if not exists tarot_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spread_type text not null check (spread_type in ('One Card', 'Three Card', 'Celtic Cross', 'Custom')),
  query text,
  cards_drawn jsonb not null, -- Array of { card_id, position, orientation, deck_id }
  reflection text, -- User's journal entry about the reading
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_rituals_user_id on rituals(user_id);
create index if not exists idx_ritual_steps_ritual_id on ritual_steps(ritual_id);
create index if not exists idx_tarot_readings_user_id on tarot_readings(user_id);

-- RLS Policies
alter table rituals enable row level security;
alter table ritual_steps enable row level security;
alter table tarot_readings enable row level security;

-- Rituals Policies
create policy "Users can view accessible rituals"
  on rituals for select
  using (
    auth.uid() = user_id
    or
    (visibility = 'public' and approval_status = 'approved')
  );

create policy "Users can insert their own rituals"
  on rituals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own rituals"
  on rituals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own rituals"
  on rituals for delete
  using (auth.uid() = user_id);

-- Ritual Steps Policies (Cascade from Ritual access)
create policy "Users can view steps of accessible rituals"
  on ritual_steps for select
  using (exists (
    select 1 from rituals 
    where id = ritual_steps.ritual_id 
    and (user_id = auth.uid() or (visibility = 'public' and approval_status = 'approved'))
  ));

create policy "Users can insert steps to their rituals"
  on ritual_steps for insert
  with check (exists (select 1 from rituals where id = ritual_steps.ritual_id and user_id = auth.uid()));

create policy "Users can update steps of their rituals"
  on ritual_steps for update
  using (exists (select 1 from rituals where id = ritual_steps.ritual_id and user_id = auth.uid()));

create policy "Users can delete steps of their rituals"
  on ritual_steps for delete
  using (exists (select 1 from rituals where id = ritual_steps.ritual_id and user_id = auth.uid()));

-- Tarot Policies
create policy "Users can view their own readings"
  on tarot_readings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own readings"
  on tarot_readings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own readings"
  on tarot_readings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own readings"
  on tarot_readings for delete
  using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table rituals;
alter publication supabase_realtime add table tarot_readings;
